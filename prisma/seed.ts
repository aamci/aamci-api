// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // 1) common password hash for all dummy users
  const hash = await argon2.hash('password123');

  // 2) 10 patients (bulk) — createMany returns count, not rows
  await prisma.user.createMany({
    data: Array.from({ length: 10 }).map(() => ({
      email: faker.internet.email().toLowerCase(),
      password: hash,
      role: 'PATIENT', // enum literal is fine
    })),
    skipDuplicates: true,
  });

  // 3) one doctor we can reference later (needs an id)
  const doctor = await prisma.user.create({
    data: {
      email: faker.internet.email().toLowerCase(),
      password: hash,
      role: 'DOCTOR',
    },
  });

  // (optional) more doctors
  await prisma.user.createMany({
    data: Array.from({ length: 5 }).map(() => ({
      email: faker.internet.email().toLowerCase(),
      password: hash,
      role: 'DOCTOR',
    })),
    skipDuplicates: true,
  });

  // 4) pick any patient to use for the appointment
  const anyPatient = await prisma.user.findFirst({
    where: { role: 'PATIENT' },
    orderBy: { createdAt: 'asc' },
  });
  if (!anyPatient) throw new Error('No patient found after seeding users');

  // 5) create a slot for the doctor
  const slot = await prisma.availabilitySlot.create({
    data: {
      ownerType: 'DOCTOR',
      ownerId: doctor.id, // <-- we have the doctor id from the create() above
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000),
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  // 6) create an appointment for that patient and slot
  await prisma.appointment.create({
    data: {
      slotId: slot.id,
      patientId: anyPatient.id, // <-- use an actual patient id
      status: 'PENDING',
      notes: 'Consultation initiale',
    },
  });

  // 7) pharmacy + product + inventory
  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: 'Pharmacie Centrale',
      city: 'Paris',
      open: true,
    },
  });

  const product = await prisma.product.create({
    data: {
      pharmacyId: pharmacy.id,
      name: 'Doliprane 500mg',
      sku: 'DOL500-' + faker.string.alphanumeric(6).toUpperCase(),
      price: 3.5,
      prescriptionRequired: false,
      // (optional) if your schema has `inventory` relation:
      // inventory: { create: { quantity: 150 } },
    },
  });

  // If you don’t use nested create above, ensure Inventory model exists then:
  await prisma.inventory.create({
    data: {
      productId: product.id,
      quantity: 150,
    },
  });

  console.log('✅ Dummy data seeded successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
