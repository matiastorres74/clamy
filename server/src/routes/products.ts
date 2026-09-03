import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isValidCategory } from '../lib/categories';
import { requireAdmin } from '../middleware/requireAdmin';

export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const { category, search } = req.query;

  const where: Record<string, unknown> = {};
  if (typeof category === 'string' && category.length > 0) {
    where.category = category;
  }
  if (typeof search === 'string' && search.trim().length > 0) {
    where.name = { contains: search.trim() };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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
