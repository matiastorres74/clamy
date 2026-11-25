import { prisma } from './prisma';

export async function isValidCategory(value: unknown): Promise<boolean> {
  if (typeof value !== 'string' || value.length === 0) return false;
  const found = await prisma.category.findUnique({ where: { id: value }, select: { id: true } });
  return found !== null;
}

// Turns a label into a URL-safe id: "Decoración de mesa" -> "decoracion-de-mesa".
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
