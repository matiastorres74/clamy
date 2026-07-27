import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

const SAMPLE_PRODUCTS = [
  {
    name: 'Lámpara colgante Nordic',
    description: 'Lámpara colgante minimalista de metal, ideal para living o comedor.',
    price: 45000,
    category: 'lighting',
    featured: true,
  },
  {
    name: 'Aplique de pared LED',
    description: 'Aplique de pared con luz LED cálida regulable.',
    price: 28500,
    category: 'lighting',
    featured: false,
  },
  {
    name: 'Velador Alambre',
    description: 'Velador de mesa de luz con estructura de alambre y pantalla de tela.',
    price: 19900,
    category: 'lighting',
    featured: false,
  },
  {
    name: 'Espejo redondo decorativo',
    description: 'Espejo circular con marco de metal, 60cm de diámetro.',
    price: 32000,
    category: 'decoration',
    featured: true,
  },
  {
    name: 'Jarrón cerámico texturado',
    description: 'Jarrón decorativo de cerámica con textura artesanal.',
    price: 15500,
    category: 'decoration',
    featured: false,
  },
  {
    name: 'Set de cuadros abstractos',
    description: 'Set de 3 cuadros decorativos con diseño abstracto en blanco y negro.',
    price: 38000,
    category: 'decoration',
    featured: false,
  },
  {
    name: 'Juego de tazas de porcelana',
    description: 'Set de 6 tazas de porcelana con plato, ideal para café o té.',
    price: 21000,
    category: 'kitchen',
    featured: false,
  },
  {
    name: 'Set de cuchillos profesional',
    description: 'Juego de cuchillos de acero inoxidable con soporte de madera.',
    price: 34500,
    category: 'kitchen',
    featured: true,
  },
  {
    name: 'Mesa ratona nogal',
    description: 'Mesa ratona de madera de nogal con patas de hierro.',
    price: 89000,
    category: 'furniture',
    featured: true,
  },
  {
    name: 'Silla tapizada gris',
    description: 'Silla tapizada en tela gris con estructura de madera.',
    price: 52000,
    category: 'furniture',
    featured: false,
  },
  {
    name: 'Organizador multiuso de bambú',
    description: 'Organizador de bambú apto para escritorio, baño o cocina.',
    price: 9800,
    category: 'everyday-use',
    featured: false,
  },
  {
    name: 'Set de portavelas de vidrio',
    description: 'Juego de 3 portavelas de vidrio de distintos tamaños.',
    price: 13200,
    category: 'everyday-use',
    featured: false,
  },
];

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in server/.env before seeding');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
  console.log(`Admin user "${username}" ready.`);

  const existingCount = await prisma.product.count();
  if (existingCount === 0) {
    await prisma.product.createMany({ data: SAMPLE_PRODUCTS });
    console.log(`Seeded ${SAMPLE_PRODUCTS.length} sample products.`);
  } else {
    console.log(`Skipping product seed, ${existingCount} product(s) already exist.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
