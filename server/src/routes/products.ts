import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isValidCategory } from '../lib/categories';
import { requireAdmin } from '../middleware/requireAdmin';

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

function parseLimit(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || raw.trim().length === 0) return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return undefined;
  return Math.min(parsed, MAX_LIMIT);
}

productsRouter.get('/', async (req, res) => {
  const { category, search, featured } = req.query;

  const where: Record<string, unknown> = {};
  if (typeof category === 'string' && category.length > 0) {
    where.category = category;
  }
  if (typeof search === 'string' && search.trim().length > 0) {
    where.id = { in: await findIdsMatchingName(search.trim()) };
  }
  if (featured === 'true') {
    where.featured = true;
  } else if (featured === 'false') {
    where.featured = false;
  }

  const take = parseLimit(req.query.limit);

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    ...(take === undefined ? {} : { take }),
  });
  res.json(products);
});

productsRouter.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  const product = await prisma.product.findUnique({ where: { id } });
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

function validateProductBody(body: any) {
  const { name, description, price, category, imageUrl, featured } = body ?? {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return 'name is required';
  }
  if (typeof description !== 'string') {
    return 'description is required';
  }
  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return 'price must be a non-negative number';
  }
  if (!isValidCategory(category)) {
    return 'category must be one of the valid category ids';
  }
  if (imageUrl !== undefined && imageUrl !== null && typeof imageUrl !== 'string') {
    return 'imageUrl must be a string';
  }
  if (featured !== undefined && typeof featured !== 'boolean') {
    return 'featured must be a boolean';
  }
  return null;
}

productsRouter.post('/', requireAdmin, async (req, res) => {
  const error = validateProductBody(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const { name, description, price, category, imageUrl, featured } = req.body;
  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      description,
      price,
      category,
      imageUrl: imageUrl ?? null,
      featured: featured ?? false,
    },
  });
  res.status(201).json(product);
});

productsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  const error = validateProductBody(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const { name, description, price, category, imageUrl, featured } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name.trim(),
        description,
        price,
        category,
        imageUrl: imageUrl ?? null,
        featured: featured ?? false,
      },
    });
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
    res.status(204).send();
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    res.status(404).json({ error: 'Product not found' });
  }
});
