import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { slugify } from '../lib/categories';
import { requireAdmin } from '../middleware/requireAdmin';

export const categoriesRouter = Router();

const MAX_LABEL_LENGTH = 60;
const SELECT = { id: true, label: true, position: true } as const;

function readLabel(body: unknown): string | null {
  const label = (body as { label?: unknown } | undefined)?.label;
  if (typeof label !== 'string') return null;
  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_LABEL_LENGTH) return null;
  return trimmed;
}

function isRecordNotFoundError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    select: SELECT,
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(categories);
});

categoriesRouter.post('/', requireAdmin, async (req, res) => {
  const label = readLabel(req.body);
  if (!label) {
    return res.status(400).json({ error: `label is required (max ${MAX_LABEL_LENGTH} chars)` });
  }
  const id = slugify(label);
  if (!id) {
    return res.status(400).json({ error: 'label must contain letters or digits' });
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (existing) {
    return res.status(409).json({ error: 'A category with that name already exists' });
  }

  // New categories go to the end of the list.
  const last = await prisma.category.aggregate({ _max: { position: true } });
  const category = await prisma.category.create({
    data: { id, label, position: (last._max.position ?? -1) + 1 },
    select: SELECT,
  });
  res.status(201).json(category);
});

// Sets the display order. The body lists every category id in the new order;
// a partial or unknown list is rejected so a stale admin tab can't scramble it.
categoriesRouter.put('/order', requireAdmin, async (req, res) => {
  const ids = (req.body as { ids?: unknown } | undefined)?.ids;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
    return res.status(400).json({ error: 'ids must be a list of category ids' });
  }
  const current = await prisma.category.findMany({ select: { id: true } });
  const known = new Set(current.map((c) => c.id));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((id) => known.has(id))) {
    return res.status(409).json({ error: 'ids must list every category exactly once' });
  }

  await prisma.$transaction(
    ids.map((id, position) => prisma.category.update({ where: { id }, data: { position } })),
  );
  const categories = await prisma.category.findMany({
    select: SELECT,
    orderBy: { position: 'asc' },
  });
  res.json(categories);
});

// Only the label is editable: the id is what products and shared links point at.
categoriesRouter.put('/:id', requireAdmin, async (req, res) => {
  const label = readLabel(req.body);
  if (!label) {
    return res.status(400).json({ error: `label is required (max ${MAX_LABEL_LENGTH} chars)` });
  }
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { label },
      select: SELECT,
    });
    res.json(category);
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    res.status(404).json({ error: 'Category not found' });
  }
});

// Refuses while products still use the category, so none end up pointing at
// a category that no longer exists (and silently vanish from every filter).
categoriesRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const inUse = await prisma.product.count({ where: { category: id } });
  if (inUse > 0) {
    return res
      .status(409)
      .json({ error: 'Category still has products', productCount: inUse });
  }
  try {
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
    res.status(404).json({ error: 'Category not found' });
  }
});
