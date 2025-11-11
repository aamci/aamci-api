// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // 1) mot de passe commun
  const passwordHash = await argon2.hash('password123');

  // 2) créer 8 patients
  await prisma.user.createMany({
    data: Array.from({ length: 8 }).map(() => ({
      email: faker.internet.email().toLowerCase(),
      password: passwordHash,
      role: 'PATIENT',
      fullName: faker.person.fullName(),
      city: faker.location.city(),
    })),
    skipDuplicates: true,
  });

  // on récupère un patient pour lier les rendez-vous
  const patient = await prisma.user.findFirst({
    where: { role: 'PATIENT' },
    orderBy: { createdAt: 'asc' },
  });
  if (!patient) {
    throw new Error('No patient created — cannot continue seeding.');
  }

  // 3) créer quelques DOCTOR avec leur profil
  const doctor1 = await prisma.user.create({
    data: {
      email: 'cardio.paris@sante.test',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Amélie Dupont',
      city: 'Paris',
      avatarUrl: null,
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor1.id,
      specialty: 'Cardiologie',
      hospitalType: 'Clinique privée',
      address: '12 rue de la Santé, 75013 Paris',
      city: 'Paris',
      presentation: 'Cardiologue depuis 12 ans, spécialisée en prévention cardiovasculaire.',
      formations: 'DES Cardiologie (Paris); Diplôme d’échographie cardiaque',
      experiences: 'CHU Saint-Louis (5 ans); Cabinet privé (7 ans)',
    },
  });

  const doctor2 = await prisma.user.create({
    data: {
      email: 'derm.lyon@sante.test',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr B. Martin',
      city: 'Lyon',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor2.id,
      specialty: 'Dermatologie',
      hospitalType: 'Cabinet',
      address: '4 place Bellecour, 69002 Lyon',
      city: 'Lyon',
      presentation: 'Dermatologue, prise en charge acné, suivi long terme.',
      formations: 'DES Dermatologie (Lyon)',
      experiences: 'Cabinet libéral (6 ans)',
    },
  });

  // 4) créer un slot de dispo pour doctor1
  const start = new Date();
  start.setHours(start.getHours() + 2); // dans 2h
  const end = new Date(start.getTime() + 30 * 60 * 1000); // +30min

  const slot = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      start,
      end,
      capacity: 1,
      status: 'ACTIVE',
    },
  });
    const consultKind = await prisma.appointmentKind.findFirst({
    where: { doctorId: null, name: 'Consultation' },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot.id,
      patientId: patient.id,
      status: 'PENDING',
      kindId: consultKind ? consultKind.id : null,
    },
  });
  // 5) créer un appointment pour ce slot avec le patient
  await prisma.appointment.create({
    data: {
      slotId: slot.id,
      patientId: patient.id,
      status: 'PENDING',
      type: 'PREMIERE_CONSULTATION', // ou 'CONSULTATION' selon ton enum
      notes: 'Consultation de test (seed)',
    },
  });

// prisma/seed.ts (extrait à ajouter)
const globalConsult = await prisma.appointmentKind.create({
  data: {
    name: 'Consultation',
    description: 'Consultation standard 30 min',
  },
});

  const globalSuivi = await prisma.appointmentKind.create({
  data: {
    name: 'Suivi',
    description: 'Rendez-vous de suivi',
  },
});

// pour le doctor1 (qu’on avait créé)
await prisma.appointmentKind.create({
  data: {
    name: 'Consultation cardiologie',
    description: 'Pour patients cardiaques connus',
    doctorId: doctor1.id,
  },
});
await prisma.appointment.create({
  data: {
    slotId: slot.id,
    patientId: patient.id,
    status: 'PENDING',
    kindId: globalConsult.id, // use the global "Consultation" kind created above
    notes: 'Consultation initiale',
  },
});

  console.log('✅ Seed terminé : patients, doctors, profiles, slot, appointment créés.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });