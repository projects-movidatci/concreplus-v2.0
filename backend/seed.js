require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantId = 1n;
  
  // Crear el tenant por defecto
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: 'Concreplus Principal',
      slug: 'concreplus-principal'
    }
  });
  
  // Crear el rol administrador
  await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'admin' } },
    update: {},
    create: { tenantId, name: 'admin' }
  });

  await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'vendedor' } },
    update: {},
    create: { tenantId, name: 'vendedor' }
  });

  await prisma.role.upsert({
    where: { tenantId_name: { tenantId, name: 'despachador' } },
    update: {},
    create: { tenantId, name: 'despachador' }
  });

  console.log('✅ Tenant principal y roles creados correctamente.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
