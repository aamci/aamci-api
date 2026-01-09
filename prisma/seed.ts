// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Configurer faker en français (v8+ utilise setDefaultRefDate au lieu de locale)

async function main() {
  console.log('🌱 Démarrage du seed...');

  // Nettoyer la base de données
  console.log('🧹 Nettoyage de la base de données...');
  await prisma.appointment.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.availabilityPreference.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.appointmentKind.deleteMany();
  await prisma.medicalNote.deleteMany();
  await prisma.wallet.deleteMany(); // Delete wallets before users (foreign key)
  await prisma.facilityManager.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.facility.deleteMany();

  // Mot de passe commun pour tous les comptes de test
  const passwordHash = await argon2.hash('password123');

  // ========================================
  // 1. CRÉER LES FACILITIES (Cliniques, CHU, Centres)
  // ========================================
  console.log('🏥 Création des établissements...');

  const chuParis = await prisma.facility.create({
    data: {
      name: 'CHU Saint-Louis',
      type: 'CHU',
      description: 'Centre Hospitalier Universitaire de référence à Paris, spécialisé en hématologie et dermatologie',
      address: '1 Avenue Claude Vellefaux',
      city: 'Paris',
      geoLat: 48.8728,
      geoLng: 2.3686,
      phone: '+33 1 42 49 49 49',
      email: 'contact@chu-stlouis.fr',
      website: 'https://chu-stlouis.fr',
      services: JSON.stringify(['Cardiologie', 'Dermatologie', 'Hématologie', 'Pédiatrie', 'Urgences']),
    },
  });

  const cliniqueParis = await prisma.facility.create({
    data: {
      name: 'Clinique Cardio Paris',
      type: 'CLINIC',
      description: 'Clinique privée spécialisée en cardiologie et chirurgie cardiovasculaire',
      address: '12 rue de la Santé',
      city: 'Paris',
      geoLat: 48.8366,
      geoLng: 2.3442,
      phone: '+33 1 45 67 89 01',
      email: 'contact@cardio-paris.fr',
      website: 'https://cardio-paris.fr',
      services: JSON.stringify(['Cardiologie', 'Chirurgie cardiaque', 'Échocardiographie', 'Holter']),
    },
  });

  const centreLyon = await prisma.facility.create({
    data: {
      name: 'Centre Médical Bellecour',
      type: 'CENTER',
      description: 'Centre médical pluridisciplinaire au cœur de Lyon',
      address: '4 place Bellecour',
      city: 'Lyon',
      geoLat: 45.7578,
      geoLng: 4.8320,
      phone: '+33 4 78 42 12 34',
      email: 'contact@centre-bellecour.fr',
      website: 'https://centre-bellecour.fr',
      services: JSON.stringify(['Dermatologie', 'Médecine générale', 'Kinésithérapie', 'Nutrition']),
    },
  });

  const polycliniqueMarseille = await prisma.facility.create({
    data: {
      name: 'Polyclinique du Vieux-Port',
      type: 'POLYCLINIC',
      description: 'Polyclinique moderne avec plateau technique complet',
      address: '7 quai des Belges',
      city: 'Marseille',
      geoLat: 43.2965,
      geoLng: 5.3698,
      phone: '+33 4 91 55 12 34',
      email: 'contact@polyclinique-marseille.fr',
      services: JSON.stringify(['Chirurgie', 'Médecine générale', 'Imagerie médicale']),
    },
  });

  // ========================================
  // 2. CRÉER LES PATIENTS avec profils détaillés
  // ========================================
  console.log('👥 Création des patients...');

  const patients: any[] = [];
  const patientNames = [
    { fullName: 'Marie Dubois', email: 'marie.dubois@email.fr', city: 'Paris', sex: 'F', birthdate: new Date('1985-03-15') },
    { fullName: 'Jean Martin', email: 'jean.martin@email.fr', city: 'Lyon', sex: 'M', birthdate: new Date('1978-07-22') },
    { fullName: 'Sophie Lemoine', email: 'sophie.lemoine@email.fr', city: 'Paris', sex: 'F', birthdate: new Date('1992-11-08') },
    { fullName: 'Pierre Durand', email: 'pierre.durand@email.fr', city: 'Marseille', sex: 'M', birthdate: new Date('1965-05-30') },
    { fullName: 'Isabelle Moreau', email: 'isabelle.moreau@email.fr', city: 'Lyon', sex: 'F', birthdate: new Date('1990-09-12') },
    { fullName: 'Thomas Bernard', email: 'thomas.bernard@email.fr', city: 'Paris', sex: 'M', birthdate: new Date('1988-01-25') },
    { fullName: 'Catherine Laurent', email: 'catherine.laurent@email.fr', city: 'Marseille', sex: 'F', birthdate: new Date('1975-12-03') },
    { fullName: 'François Petit', email: 'francois.petit@email.fr', city: 'Lyon', sex: 'M', birthdate: new Date('1995-06-18') },
  ];

  for (const patientData of patientNames) {
    const user = await prisma.user.create({
      data: {
        email: patientData.email,
        password: passwordHash,
        role: 'PATIENT',
        fullName: patientData.fullName,
        city: patientData.city,
        sex: patientData.sex,
        birthdate: patientData.birthdate,
        phone: `+33 6 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90 + 10)}`,
        emailVerified: true,
      },
    });

    await prisma.patientProfile.create({
      data: {
        userId: user.id,
        civility: patientData.sex === 'F' ? 'MME' : 'MR',
        birthLastName: patientData.fullName.split(' ')[1],
        firstName: patientData.fullName.split(' ')[0],
        birthDate: patientData.birthdate,
        birthPlace: faker.location.city(),
        birthCountry: 'France',
        phonePrimary: user.phone,
        addressLine1: faker.location.streetAddress(),
        postalCode: faker.location.zipCode('#####'),
        city: patientData.city,
        country: 'France',
        socialSecurityNumber: faker.string.numeric(15),
        insuranceProvider: ['CPAM', 'MSA', 'RSI'][Math.floor(Math.random() * 3)],
        mutualInsurance: ['Harmonie Mutuelle', 'MGEN', 'Malakoff Humanis'][Math.floor(Math.random() * 3)],
        bloodGroup: ['A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-'][Math.floor(Math.random() * 8)],
        heightCm: 160 + Math.floor(Math.random() * 30),
        weightKg: 55 + Math.floor(Math.random() * 40),
        patientCode: `PAT-${user.id.substring(0, 8).toUpperCase()}`,
      },
    });

    patients.push(user);
  }

  // ========================================
  // 3. CRÉER LES DOCTORS avec profils détaillés
  // ========================================
  console.log('👨‍⚕️ Création des médecins...');

  // Docteur 1: Cardiologue Paris (CHU + Clinique)
  const doctor1 = await prisma.user.create({
    data: {
      email: 'dr.amelie.dupont@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Amélie Dupont',
      city: 'Paris',
      sex: 'F',
      birthdate: new Date('1980-04-12'),
      phone: '+33 6 12 34 56 78',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor1.id,
      specialty: 'Cardiologie',
      hospitalType: 'Clinique privée',
      address: '12 rue de la Santé',
      city: 'Paris',
      presentation: 'Cardiologue depuis 12 ans, spécialisée en prévention cardiovasculaire et échocardiographie. Prise en charge des pathologies coronariennes, insuffisance cardiaque et troubles du rythme.',
      formations: 'DES Cardiologie et Maladies Vasculaires (Université Paris Descartes); DIU Échocardiographie; Formation Holter ECG et MAPA',
      experiences: 'CHU Saint-Louis (2012-2017) - Chef de Clinique; Clinique Cardio Paris (2017-présent) - Praticien hospitalier',
      facilities: {
        connect: [{ id: chuParis.id }, { id: cliniqueParis.id }],
      },
    },
  });

  // Docteur 2: Dermatologue Lyon
  const doctor2 = await prisma.user.create({
    data: {
      email: 'dr.benoit.martin@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Benoît Martin',
      city: 'Lyon',
      sex: 'M',
      birthdate: new Date('1983-09-25'),
      phone: '+33 6 23 45 67 89',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor2.id,
      specialty: 'Dermatologie',
      hospitalType: 'Cabinet',
      address: '4 place Bellecour',
      city: 'Lyon',
      presentation: 'Dermatologue spécialisé en dermatologie esthétique et laser. Prise en charge de l\'acné, psoriasis, eczéma et dépistage des cancers cutanés.',
      formations: 'DES Dermatologie-Vénéréologie (Université Lyon 1); DIU Lasers médicaux; Formation en dermatoscopie',
      experiences: 'Cabinet libéral Centre Bellecour (2015-présent); Consultation hospitalière CHU Lyon Sud',
      facilities: {
        connect: [{ id: centreLyon.id }],
      },
    },
  });

  // Docteur 3: Cardiologue Paris (CHU)
  const doctor3 = await prisma.user.create({
    data: {
      email: 'dr.jean.rousseau@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Jean Rousseau',
      city: 'Paris',
      sex: 'M',
      birthdate: new Date('1975-11-08'),
      phone: '+33 6 34 56 78 90',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=13',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor3.id,
      specialty: 'Cardiologie',
      hospitalType: 'CHU',
      address: '1 Avenue Claude Vellefaux',
      city: 'Paris',
      presentation: 'Cardiologue interventionnel spécialisé en électrophysiologie et implantation de stimulateurs cardiaques. Expert en ablation de la fibrillation auriculaire.',
      formations: 'DES Cardiologie (Paris 7); Master Électrophysiologie interventionnelle; DIU Rythmologie et Stimulation cardiaque',
      experiences: 'CHU Saint-Louis (2005-présent) - PU-PH, Chef du service de Rythmologie',
      facilities: {
        connect: [{ id: chuParis.id }],
      },
    },
  });

  // Docteur 4: Médecin généraliste Marseille
  const doctor4 = await prisma.user.create({
    data: {
      email: 'dr.claire.dubois@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Claire Dubois',
      city: 'Marseille',
      sex: 'F',
      birthdate: new Date('1987-02-14'),
      phone: '+33 6 45 67 89 01',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor4.id,
      specialty: 'Médecine Générale',
      hospitalType: 'Polyclinique',
      address: '7 quai des Belges',
      city: 'Marseille',
      presentation: 'Médecin généraliste avec orientation en médecine familiale. Suivi de patients tous âges, prévention, dépistage et coordination des soins.',
      formations: 'DES Médecine Générale (Université Aix-Marseille); DIU Tabacologie; Formation en éducation thérapeutique',
      experiences: 'Polyclinique du Vieux-Port (2015-présent); Médecin coordonnateur EHPAD (2018-2020)',
      facilities: {
        connect: [{ id: polycliniqueMarseille.id }],
      },
    },
  });

  // Docteur 5: Pédiatre au CHU Saint-Louis (même CHU que Dr Rousseau)
  const doctor5 = await prisma.user.create({
    data: {
      email: 'dr.sophie.lefevre@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Sophie Lefèvre',
      city: 'Paris',
      sex: 'F',
      birthdate: new Date('1985-06-20'),
      phone: '+33 6 56 78 90 12',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=9',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor5.id,
      specialty: 'Pédiatrie',
      hospitalType: 'CHU',
      address: '1 Avenue Claude Vellefaux',
      city: 'Paris',
      presentation: 'Pédiatre spécialisée en néonatologie et urgences pédiatriques. Suivi des enfants de 0 à 18 ans, vaccinations, consultations de puériculture.',
      formations: 'DES Pédiatrie (Paris 6); DIU Néonatologie; DIU Urgences pédiatriques',
      experiences: 'CHU Saint-Louis (2013-présent) - Service de Pédiatrie; Maternité Port-Royal (2010-2013)',
      facilities: {
        connect: [{ id: chuParis.id }],
      },
    },
  });

  // Docteur 6: Dermatologue au CHU Saint-Louis (même CHU)
  const doctor6 = await prisma.user.create({
    data: {
      email: 'dr.marc.bernard@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Marc Bernard',
      city: 'Paris',
      sex: 'M',
      birthdate: new Date('1978-03-30'),
      phone: '+33 6 67 89 01 23',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=14',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor6.id,
      specialty: 'Dermatologie',
      hospitalType: 'CHU',
      address: '1 Avenue Claude Vellefaux',
      city: 'Paris',
      presentation: 'Dermatologue hospitalo-universitaire spécialisé en dermatologie oncologique. Expert en chirurgie des cancers cutanés et greffes.',
      formations: 'DES Dermatologie-Vénéréologie (Paris 7); Master Oncologie cutanée; DIU Chirurgie dermatologique',
      experiences: 'CHU Saint-Louis (2008-présent) - Chef de service adjoint Dermatologie',
      facilities: {
        connect: [{ id: chuParis.id }],
      },
    },
  });

  // Docteur 7: Cardiologue à la Clinique Cardio Paris (même clinique que Dr Dupont)
  const doctor7 = await prisma.user.create({
    data: {
      email: 'dr.paul.morel@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Paul Morel',
      city: 'Paris',
      sex: 'M',
      birthdate: new Date('1982-08-15'),
      phone: '+33 6 78 90 12 34',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=15',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor7.id,
      specialty: 'Cardiologie',
      hospitalType: 'Clinique privée',
      address: '12 rue de la Santé',
      city: 'Paris',
      presentation: 'Cardiologue interventionnel spécialisé en coronarographie et angioplastie. Prise en charge des syndromes coronariens aigus.',
      formations: 'DES Cardiologie (Paris 5); Master Cardiologie interventionnelle; Formation angioplastie coronaire',
      experiences: 'Clinique Cardio Paris (2015-présent) - Cardiologue interventionnel; CHU Pitié-Salpêtrière (2010-2015)',
      facilities: {
        connect: [{ id: cliniqueParis.id }],
      },
    },
  });

  // Docteur 8: Médecin généraliste au Centre Bellecour Lyon (même centre que Dr Martin)
  const doctor8 = await prisma.user.create({
    data: {
      email: 'dr.julie.garcia@sante.fr',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Julie Garcia',
      city: 'Lyon',
      sex: 'F',
      birthdate: new Date('1989-11-05'),
      phone: '+33 6 89 01 23 45',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=10',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor8.id,
      specialty: 'Médecine Générale',
      hospitalType: 'Centre',
      address: '4 place Bellecour',
      city: 'Lyon',
      presentation: 'Médecin généraliste orientée médecine préventive et santé de la femme. Suivi gynécologique, contraception, dépistage.',
      formations: 'DES Médecine Générale (Lyon 1); DIU Gynécologie pour le médecin généraliste; Formation IVG médicamenteuse',
      experiences: 'Centre Médical Bellecour (2017-présent); Planning Familial Lyon (consultations vacations)',
      facilities: {
        connect: [{ id: centreLyon.id }],
      },
    },
  });

  // ========================================
  // 3.5. CRÉER LES FACILITY MANAGERS
  // ========================================
  console.log('👔 Création des gestionnaires d\'établissement...');

  // Gestionnaire 1: CHU Saint-Louis (peut gérer tous les docteurs du CHU)
  const manager1User = await prisma.user.create({
    data: {
      email: 'manager.chu@sante.fr',
      password: passwordHash,
      role: 'FACILITY_MANAGER',
      fullName: 'Marie Gestionnaire',
      city: 'Paris',
      sex: 'F',
      birthdate: new Date('1975-05-10'),
      phone: '+33 6 11 22 33 44',
      emailVerified: true,
    },
  });

  await prisma.facilityManager.create({
    data: {
      userId: manager1User.id,
      facilityId: chuParis.id,
      managedDoctorIds: [], // Gère tous les docteurs du CHU via la facility
    },
  });

  // Gestionnaire 2: Clinique Cardio Paris avec override individuel
  const manager2User = await prisma.user.create({
    data: {
      email: 'manager.multi@sante.fr',
      password: passwordHash,
      role: 'FACILITY_MANAGER',
      fullName: 'Pierre Multi-Clinique',
      city: 'Paris',
      sex: 'M',
      birthdate: new Date('1980-09-22'),
      phone: '+33 6 22 33 44 55',
      emailVerified: true,
    },
  });

  await prisma.facilityManager.create({
    data: {
      userId: manager2User.id,
      facilityId: cliniqueParis.id,
      managedDoctorIds: [doctor4.id], // Gère clinique + Dr Dubois en override
    },
  });

  // ========================================
  // 3.6. CRÉER LES AVAILABILITY PREFERENCES (Templates)
  // ========================================
  console.log('⚙️ Création des préférences de disponibilité...');

  // Preference 1 pour doctor1 (Dr Dupont) - Semaine standard
  await prisma.availabilityPreference.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      name: 'Semaine standard',
      description: 'Horaires habituels de consultation du lundi au vendredi',
      isDefault: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 18,
      slotDurationMins: 30,
      capacity: 1,
      allowedKindIds: [],
      excludedTimes: ['12:00-14:00'],
      minBookingNotice: 24,
      maxBookingAdvance: 90,
      autoConfirm: true,
      allowCancellation: true,
      cancellationDeadline: 24,
    },
  });

  // Preference 2 pour doctor1 - Horaires d'été
  await prisma.availabilityPreference.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      name: 'Horaires d\'été',
      description: 'Horaires réduits pour la période estivale',
      isDefault: false,
      daysOfWeek: [1, 2, 3, 4],
      startHour: 9,
      endHour: 16,
      slotDurationMins: 30,
      capacity: 1,
      allowedKindIds: [],
      excludedTimes: ['12:00-13:30'],
      minBookingNotice: 48,
      maxBookingAdvance: 60,
      autoConfirm: true,
      allowCancellation: true,
      cancellationDeadline: 48,
    },
  });

  // Preference 1 pour doctor2 (Dr Martin) - Planning cabinet
  await prisma.availabilityPreference.create({
    data: {
      ownerId: doctor2.id,
      ownerType: 'DOCTOR',
      name: 'Planning cabinet',
      description: 'Consultations au cabinet de dermatologie',
      isDefault: true,
      daysOfWeek: [1, 2, 4, 5],
      startHour: 8,
      endHour: 19,
      slotDurationMins: 20,
      capacity: 1,
      allowedKindIds: [],
      excludedTimes: ['12:30-14:00'],
      minBookingNotice: 12,
      maxBookingAdvance: 120,
      autoConfirm: true,
      allowCancellation: true,
      cancellationDeadline: 12,
    },
  });

  // Preference 2 pour doctor2 - Consultations laser
  await prisma.availabilityPreference.create({
    data: {
      ownerId: doctor2.id,
      ownerType: 'DOCTOR',
      name: 'Consultations laser',
      description: 'Créneaux dédiés aux séances laser',
      isDefault: false,
      daysOfWeek: [3],
      startHour: 14,
      endHour: 18,
      slotDurationMins: 45,
      capacity: 1,
      allowedKindIds: [],
      excludedTimes: [],
      minBookingNotice: 48,
      maxBookingAdvance: 90,
      autoConfirm: false,
      allowCancellation: true,
      cancellationDeadline: 72,
    },
  });

  // Preference 1 pour manager1 (gestionnaire CHU)
  await prisma.availabilityPreference.create({
    data: {
      ownerId: manager1User.id,
      ownerType: 'FACILITY_MANAGER',
      name: 'Template CHU standard',
      description: 'Configuration standard pour les médecins du CHU',
      isDefault: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 8,
      endHour: 17,
      slotDurationMins: 30,
      capacity: 1,
      allowedKindIds: [],
      excludedTimes: ['12:00-13:00'],
      minBookingNotice: 24,
      maxBookingAdvance: 60,
      autoConfirm: true,
      allowCancellation: true,
      cancellationDeadline: 24,
    },
  });

  // Preference 1 pour manager2 (gestionnaire clinique)
  await prisma.availabilityPreference.create({
    data: {
      ownerId: manager2User.id,
      ownerType: 'FACILITY_MANAGER',
      name: 'Template Clinique',
      description: 'Configuration pour la clinique privée',
      isDefault: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 19,
      slotDurationMins: 30,
      capacity: 1,
      allowedKindIds: [],
      excludedTimes: ['13:00-14:00'],
      minBookingNotice: 12,
      maxBookingAdvance: 120,
      autoConfirm: true,
      allowCancellation: true,
      cancellationDeadline: 12,
    },
  });

  // ========================================
  // 4. CRÉER LES APPOINTMENT KINDS (Motifs de consultation)
  // ========================================
  console.log('📋 Création des motifs de consultation...');

  // Motifs globaux (sans doctorId)
  const globalConsultation = await prisma.appointmentKind.create({
    data: {
      name: 'Consultation',
      description: 'Consultation standard 30 minutes',
    },
  });

  const globalSuivi = await prisma.appointmentKind.create({
    data: {
      name: 'Suivi',
      description: 'Rendez-vous de suivi patient connu',
    },
  });

  const globalUrgence = await prisma.appointmentKind.create({
    data: {
      name: 'Urgence',
      description: 'Consultation urgente même jour',
    },
  });

  // Motifs spécifiques au docteur 1 (Cardiologue)
  const cardioConsult = await prisma.appointmentKind.create({
    data: {
      name: 'Consultation cardiologie',
      description: 'Première consultation cardiologie - 45 min',
      doctorId: doctor1.id,
    },
  });

  const cardioEcho = await prisma.appointmentKind.create({
    data: {
      name: 'Échocardiographie',
      description: 'Échographie cardiaque doppler - 60 min',
      doctorId: doctor1.id,
    },
  });

  const cardioHolter = await prisma.appointmentKind.create({
    data: {
      name: 'Pose Holter ECG',
      description: 'Installation appareil Holter 24h - 15 min',
      doctorId: doctor1.id,
    },
  });

  // Motifs spécifiques au docteur 2 (Dermatologue)
  const dermaConsult = await prisma.appointmentKind.create({
    data: {
      name: 'Consultation dermatologie',
      description: 'Consultation dermatologique - 30 min',
      doctorId: doctor2.id,
    },
  });

  const dermaDepistage = await prisma.appointmentKind.create({
    data: {
      name: 'Dépistage grains de beauté',
      description: 'Contrôle complet dermatoscopie - 45 min',
      doctorId: doctor2.id,
    },
  });

  const dermaLaser = await prisma.appointmentKind.create({
    data: {
      name: 'Séance laser',
      description: 'Traitement laser dermatologique - 30 min',
      doctorId: doctor2.id,
    },
  });

  // Motifs spécifiques au docteur 5 (Pédiatre)
  const pediatrieConsult = await prisma.appointmentKind.create({
    data: {
      name: 'Consultation pédiatrie',
      description: 'Consultation pédiatrique - 30 min',
      doctorId: doctor5.id,
    },
  });

  const pediatrieVaccin = await prisma.appointmentKind.create({
    data: {
      name: 'Vaccination',
      description: 'Séance de vaccination - 15 min',
      doctorId: doctor5.id,
    },
  });

  // Motifs spécifiques au docteur 6 (Dermatologue CHU)
  const dermaChirurgie = await prisma.appointmentKind.create({
    data: {
      name: 'Chirurgie dermatologique',
      description: 'Exérèse lésion cutanée - 60 min',
      doctorId: doctor6.id,
    },
  });

  // Motifs spécifiques au docteur 7 (Cardiologue clinique)
  const cardioCoronarographie = await prisma.appointmentKind.create({
    data: {
      name: 'Coronarographie',
      description: 'Coronarographie diagnostique - 90 min',
      doctorId: doctor7.id,
    },
  });

  // ========================================
  // 5. CRÉER LES AVAILABILITY RULES (Nouvelles règles de disponibilité)
  // ========================================
  console.log('📅 Création des règles de disponibilité...');

  const today = new Date();
  const in3Months = new Date(today);
  in3Months.setMonth(today.getMonth() + 3);

  // Règle 1: Dr Dupont (cardiologue) - Lundi au vendredi matin
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [1, 2, 3, 4, 5], // Lundi à vendredi
      startHour: 9,
      endHour: 13,
      slotDurationMins: 30,
      capacity: 1,
      excludedTimes: ['11:00-11:30'], // Pause café
      status: 'ACTIVE',
    },
  });

  // Règle 2: Dr Dupont - Mardi et jeudi après-midi (clinique)
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [2, 4], // Mardi et jeudi
      startHour: 14,
      endHour: 18,
      slotDurationMins: 45,
      capacity: 1,
      excludedTimes: [],
      status: 'ACTIVE',
    },
  });

  // Règle 3: Dr Martin (dermatologue) - Lundi, mercredi, vendredi
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor2.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [1, 3, 5], // Lundi, mercredi, vendredi
      startHour: 8,
      endHour: 18,
      slotDurationMins: 30,
      capacity: 1,
      excludedTimes: ['12:00-14:00'], // Pause déjeuner
      status: 'ACTIVE',
    },
  });

  // Règle 4: Dr Rousseau - Lundi au vendredi (CHU)
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor3.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 8,
      endHour: 17,
      slotDurationMins: 60,
      capacity: 1,
      excludedTimes: ['12:30-13:30'], // Pause déjeuner
      status: 'ACTIVE',
    },
  });

  // Règle 5: Dr Dubois - Tous les jours sauf dimanche
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor4.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [1, 2, 3, 4, 5, 6], // Lundi au samedi
      startHour: 9,
      endHour: 19,
      slotDurationMins: 30,
      capacity: 2, // Peut voir 2 patients par créneau
      excludedTimes: ['13:00-14:00'],
      status: 'ACTIVE',
    },
  });

  // Règle 6: Dr Lefèvre (pédiatre CHU) - Lundi au vendredi
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor5.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 18,
      slotDurationMins: 30,
      capacity: 1,
      excludedTimes: ['12:00-13:00'],
      status: 'ACTIVE',
    },
  });

  // Règle 7: Dr Bernard (dermato CHU) - Mardi, jeudi, vendredi
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor6.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [2, 4, 5], // Mardi, jeudi, vendredi
      startHour: 8,
      endHour: 16,
      slotDurationMins: 60, // Créneaux longs pour chirurgie
      capacity: 1,
      excludedTimes: ['12:00-13:00'],
      status: 'ACTIVE',
    },
  });

  // Règle 8: Dr Morel (cardio clinique) - Lundi au jeudi
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor7.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [1, 2, 3, 4], // Lundi au jeudi
      startHour: 8,
      endHour: 17,
      slotDurationMins: 45,
      capacity: 1,
      excludedTimes: ['13:00-14:00'],
      status: 'ACTIVE',
    },
  });

  // Règle 9: Dr Garcia (généraliste Lyon) - Lundi, mercredi, vendredi
  await prisma.availabilityRule.create({
    data: {
      ownerId: doctor8.id,
      ownerType: 'DOCTOR',
      startDate: today,
      endDate: in3Months,
      daysOfWeek: [1, 3, 5], // Lundi, mercredi, vendredi
      startHour: 9,
      endHour: 18,
      slotDurationMins: 30,
      capacity: 1,
      excludedTimes: ['12:30-14:00'], // Longue pause déjeuner
      status: 'ACTIVE',
    },
  });

  // ========================================
  // 6. CRÉER DES AVAILABILITY SLOTS avec APPOINTMENTS (réservés)
  // ========================================
  console.log('🗓️ Création des créneaux réservés...');

  // Helper pour créer des dates dans le futur proche
  const createFutureDate = (daysAhead: number, hour: number, minute: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysAhead);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  // Créneau 1: Dr Dupont - Demain 10h
  const slot1Start = createFutureDate(1, 10, 0);
  const slot1End = new Date(slot1Start.getTime() + 30 * 60000);
  const slot1 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      start: slot1Start,
      end: slot1End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot1.id,
      patientId: patients[0].id, // Marie Dubois
      status: 'CONFIRMED',
      kindId: cardioConsult.id,
      notes: 'Première consultation pour essoufflement à l\'effort',
    },
  });

  // Créneau 2: Dr Dupont - Dans 3 jours 14h
  const slot2Start = createFutureDate(3, 14, 0);
  const slot2End = new Date(slot2Start.getTime() + 45 * 60000);
  const slot2 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      start: slot2Start,
      end: slot2End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  const appointment2 = await prisma.appointment.create({
    data: {
      slotId: slot2.id,
      patientId: patients[1].id, // Jean Martin
      status: 'CONFIRMED',
      kindId: cardioEcho.id,
      notes: 'Échocardiographie de contrôle post-infarctus',
    },
  });

  // Créneau 3: Dr Martin - Demain 9h
  const slot3Start = createFutureDate(1, 9, 0);
  const slot3End = new Date(slot3Start.getTime() + 30 * 60000);
  const slot3 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor2.id,
      ownerType: 'DOCTOR',
      start: slot3Start,
      end: slot3End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot3.id,
      patientId: patients[2].id, // Sophie Lemoine
      status: 'CONFIRMED',
      kindId: dermaConsult.id,
      notes: 'Consultation acné - traitement en cours',
    },
  });

  // Créneau 4: Dr Martin - Dans 2 jours 10h30
  const slot4Start = createFutureDate(2, 10, 30);
  const slot4End = new Date(slot4Start.getTime() + 45 * 60000);
  const slot4 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor2.id,
      ownerType: 'DOCTOR',
      start: slot4Start,
      end: slot4End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  const appointment4 = await prisma.appointment.create({
    data: {
      slotId: slot4.id,
      patientId: patients[3].id, // Pierre Durand
      status: 'CONFIRMED',
      kindId: dermaDepistage.id,
      notes: 'Dépistage annuel mélanome - antécédents familiaux',
    },
  });

  // Créneau 5: Dr Rousseau - Dans 5 jours 9h
  const slot5Start = createFutureDate(5, 9, 0);
  const slot5End = new Date(slot5Start.getTime() + 60 * 60000);
  const slot5 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor3.id,
      ownerType: 'DOCTOR',
      start: slot5Start,
      end: slot5End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot5.id,
      patientId: patients[4].id, // Isabelle Moreau
      status: 'PENDING',
      kindId: globalConsultation.id,
      notes: 'Consultation pour palpitations',
    },
  });

  // Créneau 6: Dr Dubois - Demain 15h (2 patients - capacité 2)
  const slot6Start = createFutureDate(1, 15, 0);
  const slot6End = new Date(slot6Start.getTime() + 30 * 60000);
  const slot6 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor4.id,
      ownerType: 'DOCTOR',
      start: slot6Start,
      end: slot6End,
      capacity: 2,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot6.id,
      patientId: patients[5].id, // Thomas Bernard
      status: 'CONFIRMED',
      kindId: globalConsultation.id,
      notes: 'Renouvellement ordonnance',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot6.id,
      patientId: patients[6].id, // Catherine Laurent
      status: 'CONFIRMED',
      kindId: globalSuivi.id,
      notes: 'Suivi diabète type 2',
    },
  });

  // Créneau 7: Dr Dupont - Dans 7 jours (rendez-vous annulé)
  const slot7Start = createFutureDate(7, 11, 0);
  const slot7End = new Date(slot7Start.getTime() + 30 * 60000);
  const slot7 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor1.id,
      ownerType: 'DOCTOR',
      start: slot7Start,
      end: slot7End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot7.id,
      patientId: patients[7].id, // François Petit
      status: 'CANCELLED',
      kindId: cardioConsult.id,
      notes: 'Patient a annulé pour raisons personnelles',
    },
  });

  // Créneau 8: Dr Martin - Hier (rendez-vous passé)
  const slot8Start = createFutureDate(-1, 14, 0);
  const slot8End = new Date(slot8Start.getTime() + 30 * 60000);
  const slot8 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor2.id,
      ownerType: 'DOCTOR',
      start: slot8Start,
      end: slot8End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot8.id,
      patientId: patients[0].id, // Marie Dubois
      status: 'CONFIRMED',
      kindId: dermaLaser.id,
      notes: 'Séance laser acné - séance 2/4',
    },
  });

  // Créneau 9: Dr Rousseau - Il y a 3 jours (no-show)
  const slot9Start = createFutureDate(-3, 10, 0);
  const slot9End = new Date(slot9Start.getTime() + 60 * 60000);
  const slot9 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor3.id,
      ownerType: 'DOCTOR',
      start: slot9Start,
      end: slot9End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot9.id,
      patientId: patients[1].id, // Jean Martin
      status: 'NO_SHOW',
      kindId: globalConsultation.id,
      notes: 'Patient ne s\'est pas présenté',
    },
  });

  // Créneau 10: Dr Lefèvre (pédiatre) - Dans 2 jours 10h
  const slot10Start = createFutureDate(2, 10, 0);
  const slot10End = new Date(slot10Start.getTime() + 30 * 60000);
  const slot10 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor5.id,
      ownerType: 'DOCTOR',
      start: slot10Start,
      end: slot10End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot10.id,
      patientId: patients[4].id, // Isabelle Moreau
      status: 'CONFIRMED',
      kindId: pediatrieConsult.id,
      notes: 'Consultation pour enfant - fièvre persistante',
    },
  });

  // Créneau 11: Dr Bernard (dermato CHU) - Dans 4 jours 9h
  const slot11Start = createFutureDate(4, 9, 0);
  const slot11End = new Date(slot11Start.getTime() + 60 * 60000);
  const slot11 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor6.id,
      ownerType: 'DOCTOR',
      start: slot11Start,
      end: slot11End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot11.id,
      patientId: patients[3].id, // Pierre Durand
      status: 'CONFIRMED',
      kindId: dermaChirurgie.id,
      notes: 'Exérèse carcinome basocellulaire bras droit',
    },
  });

  // Créneau 12: Dr Morel (cardio clinique) - Dans 6 jours 14h
  const slot12Start = createFutureDate(6, 14, 0);
  const slot12End = new Date(slot12Start.getTime() + 45 * 60000);
  const slot12 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor7.id,
      ownerType: 'DOCTOR',
      start: slot12Start,
      end: slot12End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot12.id,
      patientId: patients[1].id, // Jean Martin
      status: 'PENDING',
      kindId: cardioCoronarographie.id,
      notes: 'Coronarographie programmée - douleurs thoraciques',
    },
  });

  // Créneau 13: Dr Garcia (généraliste Lyon) - Demain 16h
  const slot13Start = createFutureDate(1, 16, 0);
  const slot13End = new Date(slot13Start.getTime() + 30 * 60000);
  const slot13 = await prisma.availabilitySlot.create({
    data: {
      ownerId: doctor8.id,
      ownerType: 'DOCTOR',
      start: slot13Start,
      end: slot13End,
      capacity: 1,
      status: 'ACTIVE',
    },
  });

  await prisma.appointment.create({
    data: {
      slotId: slot13.id,
      patientId: patients[2].id, // Sophie Lemoine
      status: 'CONFIRMED',
      kindId: globalConsultation.id,
      notes: 'Consultation contraception',
    },
  });

  // ========================================
  // 7. CRÉER DES MEDICAL NOTES (Notes médicales)
  // ========================================
  console.log('📝 Création des notes médicales...');

  await prisma.medicalNote.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctor1.id,
      type: 'OBSERVATION',
      title: 'Première consultation cardiologie',
      content: 'Patiente 38 ans, consulte pour essoufflement à l\'effort depuis 3 mois. Pas d\'antécédents cardiaques. Examen clinique: TA 130/80, FC 72 bpm régulière, auscultation normale. ECG: rythme sinusal. À prévoir: échographie cardiaque et épreuve d\'effort.',
      isPrivate: false,
      tags: ['cardiologie', 'essoufflement', 'bilan'],
    },
  });

  await prisma.medicalNote.create({
    data: {
      patientId: patients[1].id,
      doctorId: doctor1.id,
      appointmentId: appointment2.id,
      type: 'FOLLOW_UP',
      title: 'Suivi post-infarctus',
      content: 'Patient 45 ans, consultation de suivi 6 mois après IDM antérieur. Traitement bien toléré (Aspirine, Clopidogrel, Ramipril, Atorvastatine). Échographie: FEVG 55%, pas de trouble cinétique segmentaire. Bon pronostic. Contrôle dans 6 mois.',
      isPrivate: false,
      tags: ['cardiologie', 'post-IDM', 'suivi'],
    },
  });

  await prisma.medicalNote.create({
    data: {
      patientId: patients[2].id,
      doctorId: doctor2.id,
      type: 'PRESCRIPTION',
      title: 'Traitement acné',
      content: 'Patiente 30 ans, acné modérée du visage. Prescription: Effizinc 1cp/j, Rubozinc gel nettoyant, Différine gel application le soir. Revoir dans 2 mois pour évaluation.',
      isPrivate: false,
      tags: ['dermatologie', 'acné', 'prescription'],
    },
  });

  await prisma.medicalNote.create({
    data: {
      patientId: patients[3].id,
      doctorId: doctor2.id,
      appointmentId: appointment4.id,
      type: 'DIAGNOSIS',
      title: 'Dépistage mélanome',
      content: 'Patient 58 ans, contrôle annuel systématique. Antécédents familiaux de mélanome (père). Examen complet au dermatoscope: pas de lésion suspecte identifiée. 3 naevi atypiques surveillés (photos prises). Prochain contrôle dans 12 mois.',
      isPrivate: false,
      tags: ['dermatologie', 'dépistage', 'mélanome', 'naevi'],
    },
  });

  await prisma.medicalNote.create({
    data: {
      patientId: patients[4].id,
      doctorId: doctor3.id,
      type: 'OBSERVATION',
      title: 'Palpitations',
      content: 'Patiente 35 ans, palpitations occasionnelles depuis 1 an, sans facteur déclenchant évident. Examen clinique normal. ECG: rythme sinusal, pas de trouble de repolarisation. Holter ECG 24h prescrit. Si palpitations récurrentes: envisager EEP.',
      isPrivate: false,
      tags: ['cardiologie', 'palpitations', 'rythmologie'],
    },
  });

  // Note privée (visible uniquement par le médecin)
  await prisma.medicalNote.create({
    data: {
      patientId: patients[5].id,
      doctorId: doctor4.id,
      type: 'OTHER',
      title: 'Note personnelle',
      content: 'Patient anxieux, tendance à dramatiser ses symptômes. Nécessite beaucoup de réassurance. Bon compliance au traitement.',
      isPrivate: true,
      tags: ['note-perso'],
    },
  });

  // ========================================
  // 8. CRÉER DES WALLETS pour les médecins
  // ========================================
  console.log('💰 Création des portefeuilles...');

  await prisma.wallet.create({
    data: {
      doctorId: doctor1.id,
      balance: 2450.50,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor2.id,
      balance: 1820.00,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor3.id,
      balance: 3100.75,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor4.id,
      balance: 1560.25,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor5.id,
      balance: 2780.00,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor6.id,
      balance: 1950.50,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor7.id,
      balance: 2340.75,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor8.id,
      balance: 1680.00,
    },
  });

  // ========================================
  // RÉSUMÉ
  // ========================================
  console.log('\n✅ Seed terminé avec succès!\n');
  console.log('📊 Résumé des données créées:');
  console.log(`   🏥 ${4} établissements (CHU, Clinique, Centre, Polyclinique)`);
  console.log(`   👥 ${patients.length} patients avec profils complets`);
  console.log(`   👨‍⚕️ ${8} médecins (3 cardiologues, 2 dermatologues, 2 généralistes, 1 pédiatre)`);
  console.log(`   📋 ${13} motifs de consultation (3 globaux + 10 spécifiques)`);
  console.log(`   📅 ${9} règles de disponibilité (system de rules)`);
  console.log(`   🗓️ ${13} créneaux réservés avec appointments`);
  console.log(`   📝 ${6} notes médicales`);
  console.log(`   💰 ${8} portefeuilles médecins\n`);

  console.log('🔑 Comptes de test (mot de passe: password123):');
  console.log('   Patients:');
  console.log('     - marie.dubois@email.fr');
  console.log('     - jean.martin@email.fr');
  console.log('     - sophie.lemoine@email.fr');
  console.log('   Médecins:');
  console.log('     - dr.amelie.dupont@sante.fr (Cardiologue Paris/Clinique)');
  console.log('     - dr.benoit.martin@sante.fr (Dermatologue Lyon)');
  console.log('     - dr.jean.rousseau@sante.fr (Cardiologue CHU Paris)');
  console.log('     - dr.claire.dubois@sante.fr (Généraliste Marseille)');
  console.log('     - dr.sophie.lefevre@sante.fr (Pédiatre CHU Paris)');
  console.log('     - dr.marc.bernard@sante.fr (Dermatologue CHU Paris)');
  console.log('     - dr.paul.morel@sante.fr (Cardiologue Clinique Paris)');
  console.log('     - dr.julie.garcia@sante.fr (Généraliste Lyon)\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
