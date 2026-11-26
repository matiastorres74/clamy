import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isValidCategory } from '../lib/categories';
import { CacheTags, cached, expireTags } from '../lib/cache';
import { AuthedRequest, optionalAdmin, requireAdmin } from '../middleware/requireAdmin';

export const productsRouter = Router();

// Ceiling on a single response, so a caller can't accidentally pull the whole
// catalogue down in one request once it grows. `limit` is opt-in: omitting it
// keeps the previous "return everything" behaviour, so existing callers are
// unaffected by this parameter being added.
const MAX_LIMIT = 100;

// Postgres compares text in LIKE literally, so the previous `contains` filter
// was both case- and accent-sensitive: "aplique" missed "Aplique", and
// "lampara" missed "Lámpara colgante Nordic". ILIKE handles the case half and
// unaccent() the accent half, but Prisma's query builder can't express
// unaccent(), so the matching ids are resolved here and then composed with the
// caller's other filters. That keeps category/featured/limit/ordering on the
// regular typed query instead of pushing the whole endpoint into raw SQL.
async function findIdsMatchingName(term: string): Promise<number[]> {
  // Wildcards are escaped so a shopper searching for "50%" gets a literal
  // match rather than a pattern. Backslash is Postgres' default LIKE escape.
  const escaped = term.replace(/[\\%_]/g, (char) => `\\${char}`);
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM "Product"
    WHERE unaccent(name) ILIKE '%' || unaccent(${escaped}) || '%'
  `;
  return rows.map((row) => row.id);
}

// The showroom never shows prices, but the admin table and edit form still
// need them. Rather than trusting the client to hide the field, the public
// read endpoints drop it unless the request carries a valid admin token; the
// dashboard's interceptor attaches one automatically once logged in.
type ProductRow = Prisma.ProductGetPayload<Record<string, never>>;

function forViewer(product: ProductRow, req: AuthedRequest) {
  if (req.admin) return product;
  const { price: _price, ...publicFields } = product;
  return publicFields;
}

function parseLimit(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || raw.trim().length === 0) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return Math.min(parsed, MAX_LIMIT);
}

// Category ids are slugs of at most 60 characters (see slugify), so anything
// longer cannot match a product and is not worth a cache entry of its own.
const MAX_CACHEABLE_CATEGORY_LENGTH = 60;

productsRouter.get('/', optionalAdmin, async (req: AuthedRequest, res) => {
  const { category, search, featured } = req.query;

  const where: Record<string, unknown> = {};
  const categoryFilter = typeof category === 'string' && category.length > 0 ? category : undefined;
  if (categoryFilter) {
    where.category = categoryFilter;
  }
  const searchTerm = typeof search === 'string' ? search.trim() : '';
  if (searchTerm.length > 0) {
    where.id = { in: await findIdsMatchingName(searchTerm) };
  }
  const featuredFilter = featured === 'true' ? true : featured === 'false' ? false : undefined;
  if (featuredFilter !== undefined) {
    where.featured = featuredFilter;
  }

  const take = parseLimit(req.query.limit);

  const load = async () => {
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(take === undefined ? {} : { take }),
    });
    return products.map((product) => forViewer(product, req));
  };

  // Only the anonymous view is shared: the admin's copy carries prices and
  // must reflect their own edits immediately. Free-text searches are left out
  // too, since every distinct term would become an entry that is rarely hit.
  const cacheable =
    !req.admin &&
    searchTerm.length === 0 &&
    (categoryFilter?.length ?? 0) <= MAX_CACHEABLE_CATEGORY_LENGTH;
  if (!cacheable) {
    return res.json(await load());
  }

  const key = `products:list:c=${categoryFilter ?? ''}|f=${featuredFilter ?? ''}|l=${take ?? ''}`;
  res.json(await cached(key, [CacheTags.products], load));
});

productsRouter.get('/:id', optionalAdmin, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  const load = async () => {
    const product = await prisma.product.findUnique({ where: { id } });
    return product ? forViewer(product, req) : null;
  };
  const product = req.admin
    ? await load()
    : await cached(`products:item:${id}`, [CacheTags.products], load);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// Prisma's update/delete throw P2025 when the row doesn't exist. Any other
// error (e.g. a DB connection failure) must reach the global error handler
// as a 500 instead of being reported as a 404.
function isRecordNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

// Upper bound on photos per product. Keeps a runaway admin form from turning
// one row into an unbounded array and caps what the detail gallery renders.
const MAX_IMAGES = 12;

function isImageList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_IMAGES &&
    value.every(
      (url) =>
        typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')),
    )
  );
}

function validateProductBody(body: any) {
  const { name, description, price, category, images, featured } = body ?? {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return 'name is required';
  }
  if (typeof description !== 'string') {
    return 'description is required';
  }
  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return 'price must be a non-negative number';
  }
  if (images !== undefined && !isImageList(images)) {
    return `images must be a list of up to ${MAX_IMAGES} http(s) URLs`;
  }
  if (featured !== undefined && typeof featured !== 'boolean') {
    return 'featured must be a boolean';
  }
  return null;
}

// Separate from validateProductBody because it needs a database lookup.
async function validateProduct(body: any): Promise<string | null> {
  const error = validateProductBody(body);
  if (error) return error;
  if (!(await isValidCategory(body.category))) {
    return 'category must be one of the valid category ids';
  }
  return null;
}

productsRouter.post('/', requireAdmin, async (req, res) => {
  const error = await validateProduct(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const { name, description, price, category, images, featured } = req.body;
  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      description,
      price,
      category,
      images: images ?? [],
      featured: featured ?? false,
    },
  });
  await expireTags(CacheTags.products);
  res.status(201).json(product);
});

productsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  const error = await validateProduct(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const { name, description, price, category, images, featured } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        description,
        price,
        category,
        images: images ?? [],
        featured: featured ?? false,
      },
    });
    await expireTags(CacheTags.products);
    res.json(product);
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    res.status(404).json({ error: 'Product not found' });
  }
});

productsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  try {
    await prisma.product.delete({ where: { id } });
    await expireTags(CacheTags.products);
    res.status(204).send();
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    res.status(404).json({ error: 'Product not found' });
  }
});
