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
  // Patient record tables (delete first due to foreign keys)
  await prisma.medicalHistory.deleteMany();
  await prisma.vaccination.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.biometricMeasurement.deleteMany();
  await prisma.clinicalObservation.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.emergencyContact.deleteMany();
  await prisma.patientConsent.deleteMany();
  // Original tables
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

  const chuLibreville = await prisma.facility.create({
    data: {
      name: 'Libreville University Hospital',
      type: 'CHU',
      description: 'Principal centre hospitalier universitaire de Libreville, référence nationale pour les soins spécialisés et la formation médicale au Gabon',
      address: 'Boulevard du Bord de Mer',
      city: 'Libreville',
      geoLat: 0.3924,
      geoLng: 9.4536,
      phone: '+241 01 76 12 34',
      email: 'contact@chu-libreville.ga',
      website: 'https://chu-libreville.ga',
      services: JSON.stringify(['Cardiologie', 'Neurologie', 'Pédiatrie', 'Gynécologie', 'Urgences', 'Chirurgie générale']),
    },
  });

  const chuOwendo = await prisma.facility.create({
    data: {
      name: 'Hospital Center University D\'Owendo',
      type: 'CHU',
      description: 'Centre hospitalier universitaire d\'Owendo, spécialisé en chirurgie et médecine interne',
      address: 'Route d\'Owendo',
      city: 'Owendo',
      geoLat: 0.2833,
      geoLng: 9.5167,
      phone: '+241 01 70 45 67',
      email: 'contact@chu-owendo.ga',
      services: JSON.stringify(['Chirurgie', 'Médecine interne', 'Orthopédie', 'Urologie', 'Maternité']),
    },
  });

  const fondationEbori = await prisma.facility.create({
    data: {
      name: 'CHU Fondation Jeanne Ebori',
      type: 'CHU',
      description: 'Fondation hospitalière universitaire dédiée à la santé maternelle et infantile au Gabon',
      address: 'Quartier Louis',
      city: 'Libreville',
      geoLat: 0.4162,
      geoLng: 9.4673,
      phone: '+241 01 74 23 45',
      email: 'contact@fondation-ebori.ga',
      services: JSON.stringify(['Gynécologie-Obstétrique', 'Pédiatrie', 'Néonatologie', 'Planification familiale']),
    },
  });

  const hopitalSinoGabonais = await prisma.facility.create({
    data: {
      name: 'Hôpital Sino-Gabonais',
      type: 'CHU',
      description: 'Hôpital de coopération sino-gabonaise, offrant des soins de haute qualité avec équipements modernes',
      address: 'Boulevard Triomphal Omar Bongo',
      city: 'Libreville',
      geoLat: 0.3996,
      geoLng: 9.4437,
      phone: '+241 01 77 89 01',
      email: 'contact@hopital-sino-gabonais.ga',
      services: JSON.stringify(['Cardiologie', 'Ophtalmologie', 'Neurochirurgie', 'Imagerie médicale', 'Urgences']),
    },
  });

  const polycliniqueElRapha = await prisma.facility.create({
    data: {
      name: 'Polyclinique El Rapha',
      type: 'POLYCLINIC',
      description: 'Polyclinique moderne proposant des consultations spécialisées et des soins ambulatoires de qualité',
      address: 'Quartier Batterie IV',
      city: 'Libreville',
      geoLat: 0.4089,
      geoLng: 9.4412,
      phone: '+241 01 72 34 56',
      email: 'contact@polyclinique-elrapha.ga',
      services: JSON.stringify(['Médecine générale', 'Pédiatrie', 'Gynécologie', 'Dermatologie', 'Analyses médicales']),
    },
  });

  const polycliniqueChambrier = await prisma.facility.create({
    data: {
      name: 'Chambrier Polyclinic',
      type: 'POLYCLINIC',
      description: 'Polyclinique familiale réputée, offrant une prise en charge globale et personnalisée',
      address: 'Quartier Glass',
      city: 'Libreville',
      geoLat: 0.3871,
      geoLng: 9.4589,
      phone: '+241 01 73 56 78',
      email: 'contact@chambrier-polyclinic.ga',
      services: JSON.stringify(['Médecine générale', 'Cardiologie', 'Neurologie', 'Chirurgie ambulatoire']),
    },
  });

  const centreDiagnostic = await prisma.facility.create({
    data: {
      name: 'Centre Diagnostic de Libreville',
      type: 'CENTER',
      description: 'Centre spécialisé en imagerie médicale et analyses diagnostiques de pointe',
      address: 'Avenue Bouet',
      city: 'Libreville',
      geoLat: 0.4234,
      geoLng: 9.4501,
      phone: '+241 01 71 23 45',
      email: 'contact@centre-diagnostic-lib.ga',
      services: JSON.stringify(['Scanner', 'IRM', 'Échographie', 'Radiologie', 'Biologie médicale']),
    },
  });

  const polycliniqueMarthenica = await prisma.facility.create({
    data: {
      name: 'Polyclinique Marthenica',
      type: 'POLYCLINIC',
      description: 'Polyclinique offrant des soins pluridisciplinaires dans un cadre moderne et accueillant',
      address: 'Quartier Montagne Sainte',
      city: 'Libreville',
      geoLat: 0.4011,
      geoLng: 9.4623,
      phone: '+241 01 74 67 89',
      email: 'contact@marthenica.ga',
      services: JSON.stringify(['Médecine interne', 'Cardiologie', 'Endocrinologie', 'Rhumatologie']),
    },
  });

  const polycliniqueTsitse = await prisma.facility.create({
    data: {
      name: 'Polyclinique Tsitse',
      type: 'POLYCLINIC',
      description: 'Établissement de santé de proximité au service des populations de Libreville',
      address: 'Quartier Lalala',
      city: 'Libreville',
      geoLat: 0.4156,
      geoLng: 9.4378,
      phone: '+241 01 75 89 01',
      email: 'contact@polyclinique-tsitse.ga',
      services: JSON.stringify(['Médecine générale', 'Pédiatrie', 'Maternité', 'Soins infirmiers']),
    },
  });

  const cabinetBatteryIV = await prisma.facility.create({
    data: {
      name: 'Medical Office Battery IV',
      type: 'CLINIC',
      description: 'Cabinet médical spécialisé situé dans le quartier Batterie IV de Libreville',
      address: 'Batterie IV',
      city: 'Libreville',
      geoLat: 0.4078,
      geoLng: 9.4398,
      phone: '+241 01 76 01 23',
      email: 'contact@medical-battery4.ga',
      services: JSON.stringify(['Médecine générale', 'Consultations spécialisées', 'Petite chirurgie']),
    },
  });

  // ========================================
  // 2. CRÉER LES PATIENTS avec profils détaillés
  // ========================================
  console.log('👥 Création des patients...');

  const patients: any[] = [];
  let patientCounter = 1;
  const patientNames = [
    {
      fullName: 'Sylvie Moussavou', email: 'sylvie.moussavou@email.ga',
      city: 'Libreville', sex: 'F', birthdate: new Date('1985-03-15'),
      phone: '+241 07 41 23 87', birthPlace: 'Libreville',
      address: 'Quartier Glass, Rue des Cocotiers', postalCode: 'BP 1234',
      insurance: 'CNAMGS', mutual: 'OGAR', blood: 'O+', height: 165, weight: 62,
    },
    {
      fullName: 'Jean-Baptiste Nzoghe', email: 'jb.nzoghe@email.ga',
      city: 'Libreville', sex: 'M', birthdate: new Date('1978-07-22'),
      phone: '+241 07 62 34 51', birthPlace: 'Port-Gentil',
      address: 'Quartier Nzeng-Ayong, Avenue du Gabon', postalCode: 'BP 2156',
      insurance: 'CNSS', mutual: 'AXA Gabon', blood: 'A+', height: 178, weight: 80,
    },
    {
      fullName: 'Carine Obame', email: 'carine.obame@email.ga',
      city: 'Owendo', sex: 'F', birthdate: new Date('1992-11-08'),
      phone: '+241 07 53 67 29', birthPlace: 'Oyem',
      address: 'Owendo, Quartier Awendjé', postalCode: 'BP 3012',
      insurance: 'CNAMGS', mutual: 'Gabon Assurances', blood: 'B+', height: 162, weight: 58,
    },
    {
      fullName: 'Patrick Nguema', email: 'patrick.nguema@email.ga',
      city: 'Libreville', sex: 'M', birthdate: new Date('1965-05-30'),
      phone: '+241 07 74 89 13', birthPlace: 'Franceville',
      address: 'Quartier La Sorbonne, Rue Nationale', postalCode: 'BP 4567',
      insurance: 'CNSS', mutual: 'OGAR', blood: 'AB+', height: 175, weight: 88,
    },
    {
      fullName: 'Bénédicte Mba', email: 'benedicte.mba@email.ga',
      city: 'Libreville', sex: 'F', birthdate: new Date('1990-09-12'),
      phone: '+241 07 35 12 76', birthPlace: 'Mouila',
      address: 'Quartier Batterie IV, Avenue du Général De Gaulle', postalCode: 'BP 5890',
      insurance: 'CNAMGS', mutual: 'AXA Gabon', blood: 'A-', height: 168, weight: 65,
    },
    {
      fullName: 'Rodrigue Mintsa', email: 'rodrigue.mintsa@email.ga',
      city: 'Owendo', sex: 'M', birthdate: new Date('1988-01-25'),
      phone: '+241 07 86 45 32', birthPlace: 'Libreville',
      address: 'Owendo Zone Industrielle, Rue du Port', postalCode: 'BP 6234',
      insurance: 'CNSS', mutual: 'Gabon Assurances', blood: 'O-', height: 182, weight: 90,
    },
    {
      fullName: 'Joëlle Bekale', email: 'joelle.bekale@email.ga',
      city: 'Libreville', sex: 'F', birthdate: new Date('1975-12-03'),
      phone: '+241 07 27 58 94', birthPlace: 'Lambaréné',
      address: 'Quartier Melen, Boulevard du Bord de Mer', postalCode: 'BP 7123',
      insurance: 'CNAMGS', mutual: 'OGAR', blood: 'B-', height: 160, weight: 70,
    },
    {
      fullName: 'Gaston Essono', email: 'gaston.essono@email.ga',
      city: 'Libreville', sex: 'M', birthdate: new Date('1995-06-18'),
      phone: '+241 07 19 73 46', birthPlace: 'Libreville',
      address: 'Quartier Akanda, Rue des Manguiers', postalCode: 'BP 8456',
      insurance: 'CNAMGS', mutual: 'AXA Gabon', blood: 'A+', height: 172, weight: 74,
    },
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
        phone: patientData.phone,
        emailVerified: true,
      },
    });

    await prisma.patientProfile.create({
      data: {
        userId: user.id,
        civility: patientData.sex === 'F' ? 'MME' : 'MR',
        birthLastName: patientData.fullName.split(' ').slice(-1)[0],
        firstName: patientData.fullName.split(' ')[0],
        birthDate: patientData.birthdate,
        birthPlace: patientData.birthPlace,
        birthCountry: 'Gabon',
        phonePrimary: patientData.phone,
        addressLine1: patientData.address,
        postalCode: patientData.postalCode,
        city: patientData.city,
        country: 'Gabon',
        socialSecurityNumber: faker.string.numeric(13),
        insuranceProvider: patientData.insurance,
        mutualInsurance: patientData.mutual,
        bloodGroup: patientData.blood,
        heightCm: patientData.height,
        weightKg: patientData.weight,
        patientCode: `PAT-${String(patientCounter++).padStart(4, '0')}`,
      },
    });

    patients.push(user);
  }

  // ========================================
  // 3. CRÉER LES DOCTORS avec profils détaillés
  // ========================================
  console.log('👨‍⚕️ Création des médecins...');

  // Docteur 1: Dr Marcel Eloi Rahandi Chambrier — Cardiologue
  const doctor1 = await prisma.user.create({
    data: {
      email: 'dr.rahandi.chambrier@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Marcel Eloi Rahandi Chambrier',
      city: 'Libreville',
      sex: 'M',
      birthdate: new Date('1972-04-12'),
      phone: '+241 07 12 34 56',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=13',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor1.id,
      specialty: 'Cardiologie',
      hospitalType: 'Polyclinique',
      address: 'Quartier Glass',
      city: 'Libreville',
      consultationPrice: 25000,
      presentation: 'Cardiologue spécialisé en prévention cardiovasculaire et échocardiographie. Prise en charge des pathologies coronariennes, insuffisance cardiaque et hypertension artérielle.',
      formations: 'Doctorat en Médecine (Université Omar Bongo Ondimba); Spécialisation Cardiologie (CHU Bordeaux); DIU Échocardiographie',
      experiences: 'CHU de Libreville (2005-2015) — Chef de service Cardiologie; Chambrier Polyclinic (2015-présent) — Praticien senior',
      facilities: { connect: [{ id: polycliniqueChambrier.id }, { id: chuLibreville.id }] },
    },
  });

  // Docteur 2: Dr Marceline Aworet Chambrier Alawe — Gynécologue
  const doctor2 = await prisma.user.create({
    data: {
      email: 'dr.marceline.alawe@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Marceline Aworet Chambrier Alawe',
      city: 'Libreville',
      sex: 'F',
      birthdate: new Date('1978-09-25'),
      phone: '+241 07 23 45 67',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor2.id,
      specialty: 'Gynécologie-Obstétrique',
      hospitalType: 'CHU',
      address: 'Quartier Louis',
      city: 'Libreville',
      consultationPrice: 20000,
      presentation: 'Gynécologue-obstétricienne spécialisée dans le suivi de grossesse, les accouchements à risque et la santé reproductive de la femme gabonaise.',
      formations: 'Doctorat en Médecine (Université des Sciences de la Santé, Libreville); DES Gynécologie-Obstétrique (Université Paris VI)',
      experiences: 'CHU Fondation Jeanne Ebori (2010-présent) — Chef de service Gynécologie; Consultations privées Chambrier Polyclinic',
      facilities: { connect: [{ id: fondationEbori.id }, { id: polycliniqueChambrier.id }] },
    },
  });

  // Docteur 3: Dr Urbain Alawoe — Médecin Généraliste
  const doctor3 = await prisma.user.create({
    data: {
      email: 'dr.urbain.alawoe@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Urbain Alawoe',
      city: 'Owendo',
      sex: 'M',
      birthdate: new Date('1980-11-08'),
      phone: '+241 07 34 56 78',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=15',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor3.id,
      specialty: 'Médecine Générale',
      hospitalType: 'CHU',
      address: 'Route d\'Owendo',
      city: 'Owendo',
      consultationPrice: 15000,
      presentation: 'Médecin généraliste avec 15 ans d\'expérience en médecine interne et urgences. Suivi des maladies tropicales, paludisme et pathologies chroniques.',
      formations: 'Doctorat en Médecine (USS Libreville); Formation Médecine tropicale (Institut Pasteur Paris)',
      experiences: 'CHU d\'Owendo (2010-présent) — Médecin des urgences; Medical Office Battery IV (consultations)',
      facilities: { connect: [{ id: chuOwendo.id }, { id: cabinetBatteryIV.id }] },
    },
  });

  // Docteur 4: Pr Minkobame — Neurologue (Professeur)
  const doctor4 = await prisma.user.create({
    data: {
      email: 'pr.minkobame@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Pr Minkobame',
      city: 'Libreville',
      sex: 'M',
      birthdate: new Date('1965-02-14'),
      phone: '+241 07 45 67 89',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=14',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor4.id,
      specialty: 'Neurologie',
      hospitalType: 'CHU',
      address: 'Boulevard Triomphal Omar Bongo',
      city: 'Libreville',
      consultationPrice: 35000,
      presentation: 'Professeur de Neurologie, pionnier de la neurologie moderne au Gabon. Expert en accidents vasculaires cérébraux, épilepsie et maladies neuro-dégénératives.',
      formations: 'Doctorat en Médecine (Paris); Agrégation Neurologie; Professeur des Universités-Praticien Hospitalier (PU-PH)',
      experiences: 'Hôpital Sino-Gabonais (2000-présent) — Chef du service Neurologie; Université des Sciences de la Santé — Professeur titulaire',
      facilities: { connect: [{ id: hopitalSinoGabonais.id }, { id: chuLibreville.id }] },
    },
  });

  // Docteur 5: Dr Carole — Pédiatre
  const doctor5 = await prisma.user.create({
    data: {
      email: 'dr.carole@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Carole',
      city: 'Libreville',
      sex: 'F',
      birthdate: new Date('1985-06-20'),
      phone: '+241 07 56 78 90',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=9',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor5.id,
      specialty: 'Pédiatrie',
      hospitalType: 'CHU',
      address: 'Quartier Louis',
      city: 'Libreville',
      consultationPrice: 18000,
      presentation: 'Pédiatre spécialisée dans le suivi du nourrisson et de l\'enfant. Expert en maladies tropicales pédiatriques, malnutrition et vaccinations.',
      formations: 'Doctorat en Médecine (USS Libreville); DES Pédiatrie (Dakar); DIU Néonatologie',
      experiences: 'CHU Fondation Jeanne Ebori (2013-présent) — Pédiatre référente; Consultations Polyclinique El Rapha',
      facilities: { connect: [{ id: fondationEbori.id }, { id: polycliniqueElRapha.id }] },
    },
  });

  // Docteur 6: Dr Gilles — Chirurgien
  const doctor6 = await prisma.user.create({
    data: {
      email: 'dr.gilles@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Gilles',
      city: 'Libreville',
      sex: 'M',
      birthdate: new Date('1978-03-30'),
      phone: '+241 07 67 89 01',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor6.id,
      specialty: 'Chirurgie Générale',
      hospitalType: 'CHU',
      address: 'Boulevard du Bord de Mer',
      city: 'Libreville',
      consultationPrice: 30000,
      presentation: 'Chirurgien généraliste expérimenté, spécialisé en chirurgie digestive et traumatologie. Pratique la chirurgie laparoscopique et les interventions d\'urgence.',
      formations: 'Doctorat en Médecine (Libreville); DES Chirurgie Générale (Abidjan); Formation laparoscopie (Paris)',
      experiences: 'CHU de Libreville (2008-présent) — Chirurgien senior; CHU d\'Owendo — Chirurgien consultant',
      facilities: { connect: [{ id: chuLibreville.id }, { id: chuOwendo.id }] },
    },
  });

  // Docteur 7: Dr Marius — Interniste
  const doctor7 = await prisma.user.create({
    data: {
      email: 'dr.marius@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Marius',
      city: 'Libreville',
      sex: 'M',
      birthdate: new Date('1982-08-15'),
      phone: '+241 07 78 90 12',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor7.id,
      specialty: 'Médecine Interne',
      hospitalType: 'Polyclinique',
      address: 'Quartier Montagne Sainte',
      city: 'Libreville',
      consultationPrice: 20000,
      presentation: 'Interniste spécialisé dans la prise en charge des maladies chroniques, diabète, hypertension et pathologies auto-immunes.',
      formations: 'Doctorat en Médecine (USS Libreville); DES Médecine Interne (Université de Bordeaux)',
      experiences: 'Polyclinique Marthenica (2014-présent) — Médecin senior; Hôpital Sino-Gabonais (consultations)',
      facilities: { connect: [{ id: polycliniqueMarthenica.id }, { id: hopitalSinoGabonais.id }] },
    },
  });

  // Docteur 8: Dr Chitou — Dermatologue
  const doctor8 = await prisma.user.create({
    data: {
      email: 'dr.chitou@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Chitou',
      city: 'Libreville',
      sex: 'M',
      birthdate: new Date('1984-05-22'),
      phone: '+241 07 89 01 23',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=16',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor8.id,
      specialty: 'Dermatologie',
      hospitalType: 'Polyclinique',
      address: 'Quartier Batterie IV',
      city: 'Libreville',
      consultationPrice: 22000,
      presentation: 'Dermatologue spécialisé dans les dermatoses tropicales, la dermatologie esthétique et le traitement des pathologies cutanées africaines.',
      formations: 'Doctorat en Médecine (USS Libreville); DES Dermatologie-Vénéréologie (Dakar)',
      experiences: 'Polyclinique El Rapha (2016-présent); Centre Diagnostic de Libreville (consultations)',
      facilities: { connect: [{ id: polycliniqueElRapha.id }, { id: centreDiagnostic.id }] },
    },
  });

  // Docteur 9: Dr Kedy — Ophtalmologue
  const doctor9 = await prisma.user.create({
    data: {
      email: 'dr.kedy@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Kedy',
      city: 'Libreville',
      sex: 'M',
      birthdate: new Date('1986-10-03'),
      phone: '+241 07 90 12 34',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=17',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor9.id,
      specialty: 'Ophtalmologie',
      hospitalType: 'CHU',
      address: 'Boulevard Triomphal Omar Bongo',
      city: 'Libreville',
      consultationPrice: 25000,
      presentation: 'Ophtalmologue spécialisé en chirurgie de la cataracte, glaucome et pathologies de la rétine. Équipé des dernières technologies d\'imagerie oculaire.',
      formations: 'Doctorat en Médecine (USS Libreville); DES Ophtalmologie (Lyon); Formation chirurgie vitréo-rétinienne',
      experiences: 'Hôpital Sino-Gabonais (2015-présent) — Chef de service Ophtalmologie; Polyclinique Tsitse (consultations)',
      facilities: { connect: [{ id: hopitalSinoGabonais.id }, { id: polycliniqueTsitse.id }] },
    },
  });

  // Docteur 10: Dr Nesta — Médecin Généraliste
  const doctor10 = await prisma.user.create({
    data: {
      email: 'dr.nesta@sante.ga',
      password: passwordHash,
      role: 'DOCTOR',
      fullName: 'Dr Nesta',
      city: 'Libreville',
      sex: 'F',
      birthdate: new Date('1990-07-14'),
      phone: '+241 07 01 23 45',
      emailVerified: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=6',
    },
  });

  await prisma.doctorProfile.create({
    data: {
      userId: doctor10.id,
      specialty: 'Médecine Générale',
      hospitalType: 'Polyclinique',
      address: 'Quartier Lalala',
      city: 'Libreville',
      consultationPrice: 15000,
      presentation: 'Médecin généraliste jeune et dynamique, orientée médecine préventive et santé communautaire. Suivi de patients de tous âges, téléconsultation disponible.',
      formations: 'Doctorat en Médecine (USS Libreville); Formation télémédecine; DU Santé publique',
      experiences: 'Polyclinique Tsitse (2018-présent); Campagnes de vaccination MSF (2019-2020)',
      facilities: { connect: [{ id: polycliniqueTsitse.id }, { id: polycliniqueElRapha.id }] },
    },
  });

  // ========================================
  // 3.5. CRÉER LES FACILITY MANAGERS
  // ========================================
  console.log('👔 Création des gestionnaires d\'établissement...');

  // Gestionnaire 1: CHU de Libreville
  const manager1User = await prisma.user.create({
    data: {
      email: 'manager.chu@sante.ga',
      password: passwordHash,
      role: 'FACILITY_MANAGER',
      fullName: 'Aimée Ndong',
      city: 'Libreville',
      sex: 'F',
      birthdate: new Date('1975-05-10'),
      phone: '+241 07 11 22 33',
      emailVerified: true,
    },
  });

  await prisma.facilityManager.create({
    data: {
      userId: manager1User.id,
      facilityId: chuLibreville.id,
      managedDoctorIds: [],
    },
  });

  // Gestionnaire 2: Chambrier Polyclinic
  const manager2User = await prisma.user.create({
    data: {
      email: 'manager.chambrier@sante.ga',
      password: passwordHash,
      role: 'FACILITY_MANAGER',
      fullName: 'Serge Bourobou',
      city: 'Libreville',
      sex: 'M',
      birthdate: new Date('1980-09-22'),
      phone: '+241 07 22 33 44',
      emailVerified: true,
    },
  });

  await prisma.facilityManager.create({
    data: {
      userId: manager2User.id,
      facilityId: polycliniqueChambrier.id,
      managedDoctorIds: [doctor3.id],
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

  void await prisma.appointmentKind.create({
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

  void await prisma.appointmentKind.create({
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

  void await prisma.appointmentKind.create({
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
  // 8. CRÉER LE DOSSIER PATIENT COMPLET (Antécédents, Vaccinations, Traitements, etc.)
  // ========================================
  console.log('📁 Création des dossiers patients complets...');

  // Sélection de patients pour le dossier complet
  const patientBernard = patients[0]; // Sylvie Moussavou
  const patientMartin = patients[1];  // Jean-Baptiste Nzoghe

  // ---- ANTÉCÉDENTS MÉDICAUX ----
  // Patient Bernard (Marie Dubois)
  await prisma.medicalHistory.createMany({
    data: [
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        category: 'ALLERGY',
        title: 'Gluten (Coeliaque)',
        description: 'Intolérance au gluten diagnostiquée en 2018. Régime sans gluten strict.',
        severity: 'modérée',
        diagnosedAt: new Date('2018-03-15'),
        isActive: true,
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        category: 'ALLERGY',
        title: 'Lait (Galactose)',
        description: 'Intolérance au lactose. Éviter produits laitiers.',
        severity: 'légère',
        diagnosedAt: new Date('2020-06-10'),
        isActive: true,
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        category: 'MEDICAL',
        title: 'Hypertension artérielle',
        description: 'HTA essentielle découverte lors d\'un bilan de santé. Traitement par IEC.',
        severity: 'modérée',
        diagnosedAt: new Date('2019-01-20'),
        isActive: true,
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor6.id,
        category: 'SURGICAL',
        title: 'Hernie inguinale',
        description: 'Cure de hernie inguinale droite par voie coelioscopique.',
        severity: 'modérée',
        diagnosedAt: new Date('2019-04-05'),
        resolvedAt: new Date('2019-04-05'),
        isActive: false,
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor6.id,
        category: 'SURGICAL',
        title: 'Prothèse totale de genou',
        description: 'PTG gauche en 2020 suite à gonarthrose évoluée.',
        severity: 'sévère',
        diagnosedAt: new Date('2020-11-15'),
        resolvedAt: new Date('2020-11-15'),
        isActive: false,
      },
      {
        patientId: patientBernard.id,
        category: 'FAMILY',
        title: 'Cancer colorectal',
        description: 'Père décédé d\'un cancer colorectal à 65 ans. Surveillance recommandée.',
        isActive: true,
      },
      {
        patientId: patientBernard.id,
        category: 'LIFESTYLE',
        title: 'Ancien fumeur',
        description: 'A fumé 10 ans (1 paquet/jour). Sevré depuis 2015.',
        isActive: false,
        resolvedAt: new Date('2015-01-01'),
      },
    ],
  });

  // Patient Martin (Jean Martin)
  await prisma.medicalHistory.createMany({
    data: [
      {
        patientId: patientMartin.id,
        doctorId: doctor1.id,
        category: 'MEDICAL',
        title: 'Diabète type 2',
        description: 'Diabète diagnostiqué en 2015. Traitement par Metformine.',
        severity: 'modérée',
        diagnosedAt: new Date('2015-06-12'),
        isActive: true,
      },
      {
        patientId: patientMartin.id,
        doctorId: doctor1.id,
        category: 'CARDIOVASCULAR',
        title: 'Infarctus du myocarde',
        description: 'IDM antérieur en 2023. Stent posé sur IVA. Traitement antiagrégant plaquettaire.',
        severity: 'sévère',
        diagnosedAt: new Date('2023-02-18'),
        isActive: true,
      },
      {
        patientId: patientMartin.id,
        category: 'ALLERGY',
        title: 'Pénicilline',
        description: 'Allergie médicamenteuse avec urticaire généralisée.',
        severity: 'sévère',
        diagnosedAt: new Date('2010-09-01'),
        isActive: true,
      },
    ],
  });

  // ---- VACCINATIONS ----
  // Patient Bernard
  await prisma.vaccination.createMany({
    data: [
      {
        patientId: patientBernard.id,
        vaccineName: 'Vaccin anti-grippal',
        vaccineType: 'Influvac Tetra',
        lotNumber: 'LOT12379',
        manufacturer: 'GSK',
        doseNumber: 2,
        injectionSite: 'Bras gauche',
        administeredAt: new Date('2024-10-04'),
        nextDoseAt: new Date('2025-10-01'),
        administeredBy: 'Dr Rahandi Chambrier',
        facilityName: 'Chambrier Polyclinic',
      },
      {
        patientId: patientBernard.id,
        vaccineName: 'Vaccin Fièvre Jaune',
        vaccineType: 'Stamaril',
        lotNumber: 'LOT93445',
        manufacturer: 'Sanofi Pasteur',
        doseNumber: 2,
        injectionSite: 'Bras gauche',
        administeredAt: new Date('2025-04-21'),
        nextDoseAt: new Date('2035-04-21'),
        administeredBy: 'Dr Martin',
        notes: 'Vaccination bien tolérée',
      },
      {
        patientId: patientBernard.id,
        vaccineName: 'Vaccin Hépatite B',
        vaccineType: 'Engerix B',
        lotNumber: 'LOT07071',
        manufacturer: 'GSK',
        doseNumber: 2,
        injectionSite: 'Bras gauche',
        administeredAt: new Date('2024-08-27'),
      },
      {
        patientId: patientBernard.id,
        vaccineName: 'DTP (Diphtérie-Tétanos-Polio)',
        vaccineType: 'Revaxis',
        lotNumber: 'LOT54376',
        manufacturer: 'Sanofi Pasteur',
        doseNumber: 1,
        injectionSite: 'Bras gauche',
        administeredAt: new Date('2023-07-20'),
      },
      {
        patientId: patientBernard.id,
        vaccineName: 'Vaccin Pneumocoque (Pneumovax 23)',
        vaccineType: 'Pneumovax 23',
        lotNumber: 'LOT75428',
        manufacturer: 'MSD',
        doseNumber: 2,
        injectionSite: 'Bras gauche',
        administeredAt: new Date('2022-05-29'),
      },
      {
        patientId: patientBernard.id,
        vaccineName: 'ROR (Rougeole-Oreillons-Rubéole)',
        vaccineType: 'Priorix',
        lotNumber: 'LOT14305',
        manufacturer: 'Sanofi Pasteur',
        doseNumber: 2,
        injectionSite: 'Bras gauche',
        administeredAt: new Date('2021-10-24'),
      },
    ],
  });

  // ---- TRAITEMENTS EN COURS ----
  // Patient Bernard
  await prisma.treatment.createMany({
    data: [
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        medicationName: 'Ramipril',
        genericName: 'Ramipril',
        dosage: '5mg',
        frequency: '1 fois par jour le matin',
        route: 'orale',
        instructions: 'Prendre à jeun avec un verre d\'eau',
        startDate: new Date('2019-02-01'),
        status: 'ACTIVE',
        indication: 'Hypertension artérielle',
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        medicationName: 'Amlodipine',
        genericName: 'Amlodipine',
        dosage: '10mg',
        frequency: '1 fois par jour',
        route: 'orale',
        startDate: new Date('2020-03-15'),
        status: 'ACTIVE',
        indication: 'Hypertension artérielle - association',
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor4.id,
        medicationName: 'Oméprazole',
        genericName: 'Oméprazole',
        dosage: '20mg',
        frequency: '1 fois par jour avant le repas',
        route: 'orale',
        startDate: new Date('2023-06-01'),
        endDate: new Date('2024-06-01'),
        status: 'COMPLETED',
        indication: 'Reflux gastro-oesophagien',
      },
    ],
  });

  // Patient Martin (post-infarctus)
  await prisma.treatment.createMany({
    data: [
      {
        patientId: patientMartin.id,
        doctorId: doctor1.id,
        medicationName: 'Aspirine Protect',
        genericName: 'Acide acétylsalicylique',
        dosage: '100mg',
        frequency: '1 fois par jour',
        route: 'orale',
        startDate: new Date('2023-02-20'),
        status: 'ACTIVE',
        indication: 'Prévention secondaire post-IDM',
      },
      {
        patientId: patientMartin.id,
        doctorId: doctor1.id,
        medicationName: 'Clopidogrel',
        genericName: 'Clopidogrel',
        dosage: '75mg',
        frequency: '1 fois par jour',
        route: 'orale',
        startDate: new Date('2023-02-20'),
        endDate: new Date('2024-02-20'),
        status: 'COMPLETED',
        indication: 'Double antiagrégation post-stent (12 mois)',
      },
      {
        patientId: patientMartin.id,
        doctorId: doctor1.id,
        medicationName: 'Atorvastatine',
        genericName: 'Atorvastatine',
        dosage: '80mg',
        frequency: '1 fois par jour le soir',
        route: 'orale',
        startDate: new Date('2023-02-20'),
        status: 'ACTIVE',
        indication: 'Hypercholestérolémie - prévention secondaire',
      },
      {
        patientId: patientMartin.id,
        doctorId: doctor4.id,
        medicationName: 'Metformine',
        genericName: 'Metformine',
        dosage: '1000mg',
        frequency: '2 fois par jour',
        route: 'orale',
        startDate: new Date('2015-06-15'),
        status: 'ACTIVE',
        indication: 'Diabète type 2',
      },
    ],
  });

  // ---- MESURES BIOMÉTRIQUES ----
  // Patient Bernard - Historique de mesures
  const biometricDates = [
    new Date('2024-12-15'),
    new Date('2024-09-10'),
    new Date('2024-06-05'),
    new Date('2024-03-01'),
    new Date('2023-12-12'),
    new Date('2023-09-08'),
  ];

  for (let i = 0; i < biometricDates.length; i++) {
    await prisma.biometricMeasurement.createMany({
      data: [
        {
          patientId: patientBernard.id,
          doctorId: doctor1.id,
          type: 'WEIGHT',
          value: 94 - i * 0.5,
          unit: 'kg',
          measuredAt: biometricDates[i],
        },
        {
          patientId: patientBernard.id,
          doctorId: doctor1.id,
          type: 'BLOOD_PRESSURE',
          value: 148 - i * 2,
          valueSecondary: 67 + i,
          unit: 'mmHg',
          measuredAt: biometricDates[i],
          isAbnormal: i < 2,
        },
        {
          patientId: patientBernard.id,
          doctorId: doctor1.id,
          type: 'HEART_RATE',
          value: 72 + Math.floor(Math.random() * 10),
          unit: 'bpm',
          measuredAt: biometricDates[i],
        },
      ],
    });
  }

  // Taille et température (une seule mesure)
  await prisma.biometricMeasurement.createMany({
    data: [
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        type: 'HEIGHT',
        value: 185,
        unit: 'cm',
        measuredAt: new Date('2024-01-10'),
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor4.id,
        type: 'TEMPERATURE',
        value: 37.2,
        unit: '°C',
        measuredAt: new Date('2024-12-01'),
      },
    ],
  });

  // ---- OBSERVATIONS CLINIQUES ----
  await prisma.clinicalObservation.createMany({
    data: [
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        title: 'Observation du 18 janv. 2026',
        content: 'Contrôle de tension artérielle: 150/85 mmHg. Poursuite du traitement.',
        category: 'VITAL_SIGNS',
        observedAt: new Date('2026-01-18'),
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        title: 'Observation du 07 janv. 2026',
        content: 'Surveillance glycémie à renforcer',
        category: 'EVOLUTION',
        isUrgent: true,
        observedAt: new Date('2026-01-07'),
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor4.id,
        title: 'Observation du 06 janv. 2026',
        content: 'Examen ORL normal. Pas de signe d\'infection.',
        category: 'EXAMINATION',
        observedAt: new Date('2026-01-06'),
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor2.id,
        title: 'Observation du 08 déc. 2025',
        content: 'Suivi post-opératoire satisfaisant. Cicatrisation en bonne voie.',
        category: 'EVOLUTION',
        observedAt: new Date('2025-12-08'),
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor4.id,
        title: 'Observation du 31 oct. 2025',
        content: 'Vaccination à jour. Prochain rappel dans 5 ans.',
        category: 'GENERAL',
        observedAt: new Date('2025-10-31'),
      },
    ],
  });

  // ---- RÉSULTATS DE LABORATOIRE ----
  await prisma.labResult.createMany({
    data: [
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        testName: 'Hémoglobine glyquée (HbA1c)',
        testCode: 'HBA1C',
        category: 'BIOCHEMISTRY',
        value: '6.2',
        unit: '%',
        normalRange: '4.0-6.0',
        interpretation: 'Légèrement élevé',
        isAbnormal: true,
        resultDate: new Date('2024-12-10'),
        labName: 'Centre Diagnostic de Libreville',
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        testName: 'Cholestérol total',
        testCode: 'CHOL',
        category: 'BIOCHEMISTRY',
        value: '2.1',
        unit: 'g/L',
        normalRange: '< 2.0',
        isAbnormal: true,
        resultDate: new Date('2024-12-10'),
        labName: 'Centre Diagnostic de Libreville',
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor1.id,
        testName: 'LDL Cholestérol',
        testCode: 'LDL',
        category: 'BIOCHEMISTRY',
        value: '1.3',
        unit: 'g/L',
        normalRange: '< 1.0',
        isAbnormal: true,
        resultDate: new Date('2024-12-10'),
        labName: 'Centre Diagnostic de Libreville',
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor4.id,
        testName: 'Créatinine',
        testCode: 'CREA',
        category: 'BIOCHEMISTRY',
        value: '82',
        unit: 'µmol/L',
        normalRange: '60-110',
        interpretation: 'Normal',
        isAbnormal: false,
        resultDate: new Date('2024-11-20'),
        labName: 'Centre Diagnostic de Libreville',
      },
      {
        patientId: patientBernard.id,
        doctorId: doctor4.id,
        testName: 'Numération Formule Sanguine',
        testCode: 'NFS',
        category: 'HEMATOLOGY',
        value: 'Normal',
        interpretation: 'Pas d\'anomalie',
        isAbnormal: false,
        resultDate: new Date('2024-11-20'),
        labName: 'Centre Diagnostic de Libreville',
      },
    ],
  });

  // ---- CONTACTS D'URGENCE ----
  await prisma.emergencyContact.createMany({
    data: [
      {
        patientId: patientBernard.id,
        fullName: 'Hervé Moussavou',
        relationship: 'Conjoint',
        phone: '+241 07 52 34 87',
        email: 'herve.moussavou@email.ga',
        isPrimary: true,
        priority: 1,
      },
      {
        patientId: patientBernard.id,
        fullName: 'Laure Moussavou',
        relationship: 'Sœur',
        phone: '+241 07 63 21 45',
        email: 'laure.moussavou@email.ga',
        isPrimary: false,
        priority: 2,
      },
      {
        patientId: patientMartin.id,
        fullName: 'Claudine Nzoghe',
        relationship: 'Épouse',
        phone: '+241 07 74 56 32',
        isPrimary: true,
        priority: 1,
      },
    ],
  });

  // ---- CONSENTEMENTS ----
  await prisma.patientConsent.createMany({
    data: [
      {
        patientId: patientBernard.id,
        type: 'CARE',
        granted: true,
        grantedAt: new Date('2024-01-15'),
        signedAt: new Date('2024-01-15'),
      },
      {
        patientId: patientBernard.id,
        type: 'DATA_SHARING',
        granted: true,
        grantedAt: new Date('2024-01-15'),
        signedAt: new Date('2024-01-15'),
      },
      {
        patientId: patientBernard.id,
        type: 'EMAIL_COMMUNICATION',
        granted: true,
        grantedAt: new Date('2024-01-15'),
        signedAt: new Date('2024-01-15'),
      },
      {
        patientId: patientBernard.id,
        type: 'TELECONSULTATION',
        granted: true,
        grantedAt: new Date('2024-03-20'),
        signedAt: new Date('2024-03-20'),
      },
      {
        patientId: patientBernard.id,
        type: 'RESEARCH',
        granted: false,
      },
      {
        patientId: patientMartin.id,
        type: 'CARE',
        granted: true,
        grantedAt: new Date('2023-02-18'),
        signedAt: new Date('2023-02-18'),
      },
      {
        patientId: patientMartin.id,
        type: 'DATA_SHARING',
        granted: true,
        grantedAt: new Date('2023-02-18'),
        signedAt: new Date('2023-02-18'),
      },
    ],
  });

  // ---- DOCUMENTS MÉDICAUX ----
  await prisma.medicalDocument.createMany({
    data: [
      {
        patientId: patientBernard.id,
        fileName: 'courrier_specialiste_27-12-2025.pdf',
        fileUrl: '/documents/courrier_specialiste_27-12-2025.pdf',
        fileType: 'application/pdf',
        fileSize: 286720,
        category: 'MEDICAL_REPORT',
        title: 'Courrier spécialiste - 27/12/2025',
        documentDate: new Date('2025-12-27'),
      },
      {
        patientId: patientBernard.id,
        fileName: 'compte_rendu_hospitalisation_23-12-2025.pdf',
        fileUrl: '/documents/compte_rendu_hospitalisation_23-12-2025.pdf',
        fileType: 'application/pdf',
        fileSize: 341500,
        category: 'MEDICAL_REPORT',
        title: 'Compte-rendu hospitalisation - 23/12/2025',
        documentDate: new Date('2025-12-23'),
      },
      {
        patientId: patientBernard.id,
        fileName: 'nfs_complete_21-12-2025.pdf',
        fileUrl: '/documents/nfs_complete_21-12-2025.pdf',
        fileType: 'application/pdf',
        fileSize: 98765,
        category: 'LAB_RESULT',
        title: 'NFS complète - 21/12/2025',
        documentDate: new Date('2025-12-21'),
      },
      {
        patientId: patientBernard.id,
        fileName: 'rapport_consultation_10-12-2025.pdf',
        fileUrl: '/documents/rapport_consultation_10-12-2025.pdf',
        fileType: 'application/pdf',
        fileSize: 167820,
        category: 'MEDICAL_REPORT',
        title: 'Rapport consultation spécialisée - 10/12/2025',
        documentDate: new Date('2025-12-10'),
      },
      {
        patientId: patientBernard.id,
        fileName: 'attestation_soins_06-12-2025.pdf',
        fileUrl: '/documents/attestation_soins_06-12-2025.pdf',
        fileType: 'application/pdf',
        fileSize: 45230,
        category: 'CERTIFICATE',
        title: 'Attestation de soins - 06/12/2025',
        documentDate: new Date('2025-12-06'),
      },
      {
        patientId: patientBernard.id,
        fileName: 'compte_rendu_operatoire_25-11-2025.pdf',
        fileUrl: '/documents/compte_rendu_operatoire_25-11-2025.pdf',
        fileType: 'application/pdf',
        fileSize: 440550,
        category: 'MEDICAL_REPORT',
        title: 'Compte-rendu opératoire - 25/11/2025',
        documentDate: new Date('2025-11-25'),
      },
    ],
  });

  // ========================================
  // 9. CRÉER DES WALLETS pour les médecins
  // ========================================
  console.log('💰 Création des portefeuilles...');

  await prisma.wallet.create({
    data: {
      doctorId: doctor1.id,
      balance: 1607000,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor2.id,
      balance: 1194000,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor3.id,
      balance: 2034000,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor4.id,
      balance: 1023000,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor5.id,
      balance: 1824000,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor6.id,
      balance: 1279000,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor7.id,
      balance: 1536000,
    },
  });

  await prisma.wallet.create({
    data: {
      doctorId: doctor8.id,
      balance: 1102000,
    },
  });

  // ========================================
  // 8. CRÉER LES DONNÉES DOSSIER PATIENT
  // ========================================
  console.log('📋 Création des données de dossier patient...');

  // Ajouter des données pour les 3 premiers patients
  const patientsForRecords = patients.slice(0, 3);

  for (const patient of patientsForRecords) {
    // ANTÉCÉDENTS MÉDICAUX
    await prisma.medicalHistory.createMany({
      data: [
        {
          patientId: patient.id,
          category: 'ALLERGY',
          title: 'Allergie à la pénicilline',
          description: 'Réaction cutanée sévère (urticaire géant) lors d\'une prise d\'amoxicilline en 2018',
          severity: 'SEVERE',
          diagnosedAt: new Date('2018-06-15'),
          isActive: true,
          notes: 'Alternative: macrolides ou fluoroquinolones',
        },
        {
          patientId: patient.id,
          category: 'ALLERGY',
          title: 'Allergie aux acariens',
          description: 'Rhinite allergique chronique',
          severity: 'MODERATE',
          diagnosedAt: new Date('2010-03-10'),
          isActive: true,
          notes: 'Traitement par antihistaminiques au besoin',
        },
        {
          patientId: patient.id,
          category: 'MEDICAL',
          title: 'Hypertension artérielle',
          description: 'HTA essentielle découverte lors d\'un bilan de santé',
          severity: 'MODERATE',
          diagnosedAt: new Date('2020-01-15'),
          isActive: true,
          doctorId: doctor1.id,
          notes: 'Sous traitement par bisoprolol 5mg',
        },
        {
          patientId: patient.id,
          category: 'MEDICAL',
          title: 'Diabète de type 2',
          description: 'Diabète non insulino-dépendant bien équilibré',
          severity: 'MODERATE',
          diagnosedAt: new Date('2019-06-20'),
          isActive: true,
          notes: 'HbA1c dernière: 6.8%',
        },
        {
          patientId: patient.id,
          category: 'SURGICAL',
          title: 'Appendicectomie',
          description: 'Appendicite aiguë opérée en urgence',
          severity: 'LOW',
          diagnosedAt: new Date('2005-08-12'),
          resolvedAt: new Date('2005-08-25'),
          isActive: false,
          notes: 'Suites simples, cicatrice de McBurney',
        },
        {
          patientId: patient.id,
          category: 'FAMILY',
          title: 'Antécédent familial cardiaque',
          description: 'Père: infarctus du myocarde à 55 ans',
          severity: 'MODERATE',
          isActive: true,
          notes: 'Surveillance cardiovasculaire renforcée',
        },
        {
          patientId: patient.id,
          category: 'LIFESTYLE',
          title: 'Ancien fumeur',
          description: 'Tabagisme actif de 2000 à 2015 (15 paquets-années)',
          severity: 'LOW',
          resolvedAt: new Date('2015-01-01'),
          isActive: false,
          notes: 'Sevrage réussi depuis 9 ans',
        },
      ],
    });

    // VACCINATIONS
    await prisma.vaccination.createMany({
      data: [
        {
          patientId: patient.id,
          vaccineName: 'COVID-19 (Pfizer-BioNTech)',
          vaccineType: 'ARNm',
          doseNumber: 3,
          administeredAt: new Date('2022-01-15'),
          administeredBy: 'Centre de vaccination de Libreville',
          lotNumber: 'FD8891',
          nextDoseAt: null,
          notes: 'Rappel effectué - schéma vaccinal complet',
        },
        {
          patientId: patient.id,
          vaccineName: 'Grippe saisonnière 2025-2026',
          vaccineType: 'Inactivé',
          doseNumber: 1,
          administeredAt: new Date('2025-10-20'),
          administeredBy: 'Pharmacie du Centre',
          lotNumber: 'GR2025-456',
          nextDoseAt: new Date('2026-10-01'),
          notes: 'Vaccination annuelle recommandée',
        },
        {
          patientId: patient.id,
          vaccineName: 'Tétanos-Diphtérie-Polio',
          vaccineType: 'Inactivé',
          doseNumber: 4,
          administeredAt: new Date('2020-05-10'),
          administeredBy: 'Cabinet Dr Dupont',
          lotNumber: 'TDP20-789',
          nextDoseAt: new Date('2030-05-10'),
          notes: 'Rappel tous les 10 ans',
        },
        {
          patientId: patient.id,
          vaccineName: 'Hépatite B',
          vaccineType: 'Recombinant',
          doseNumber: 3,
          administeredAt: new Date('2015-03-15'),
          administeredBy: 'Médecine du travail',
          lotNumber: 'HB15-123',
          notes: 'Schéma complet, immunité vérifiée',
        },
        {
          patientId: patient.id,
          vaccineName: 'ROR (Rougeole-Oreillons-Rubéole)',
          vaccineType: 'Vivant atténué',
          doseNumber: 2,
          administeredAt: new Date('1990-06-15'),
          administeredBy: 'Pédiatre Dr Martin',
          notes: 'Vaccination infantile complète',
        },
        {
          patientId: patient.id,
          vaccineName: 'Pneumocoque (Prevenar 13)',
          vaccineType: 'Conjugué',
          doseNumber: 1,
          administeredAt: new Date('2023-11-08'),
          administeredBy: 'CHU Saint-Louis',
          lotNumber: 'PN23-567',
          notes: 'Recommandé pour patient à risque cardiovasculaire',
        },
      ],
    });

    // TRAITEMENTS
    await prisma.treatment.createMany({
      data: [
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          medicationName: 'Bisoprolol',
          dosage: '5mg',
          frequency: '1 fois par jour',
          route: 'Oral',
          startDate: new Date('2020-02-01'),
          status: 'ACTIVE',
          indication: 'Hypertension artérielle',
          instructions: 'Prendre le matin au petit-déjeuner',
          renewalCount: 3,
          notes: 'Bonne tolérance, TA bien contrôlée',
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          medicationName: 'Metformine',
          dosage: '850mg',
          frequency: '2 fois par jour',
          route: 'Oral',
          startDate: new Date('2019-07-15'),
          status: 'ACTIVE',
          indication: 'Diabète type 2',
          instructions: 'Prendre pendant les repas (midi et soir)',
          renewalCount: 2,
          notes: 'Surveiller fonction rénale annuellement',
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          medicationName: 'Atorvastatine',
          dosage: '10mg',
          frequency: '1 fois par jour',
          route: 'Oral',
          startDate: new Date('2021-03-10'),
          status: 'ACTIVE',
          indication: 'Prévention cardiovasculaire, dyslipidémie',
          instructions: 'Prendre le soir au coucher',
          renewalCount: 5,
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          medicationName: 'Aspirine',
          dosage: '100mg',
          frequency: '1 fois par jour',
          route: 'Oral',
          startDate: new Date('2020-02-01'),
          status: 'ACTIVE',
          indication: 'Prévention cardiovasculaire primaire',
          instructions: 'Prendre pendant le repas du midi',
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          medicationName: 'Oméprazole',
          dosage: '20mg',
          frequency: '1 fois par jour',
          route: 'Oral',
          startDate: new Date('2020-02-01'),
          endDate: new Date('2020-05-01'),
          status: 'COMPLETED',
          indication: 'Protection gastrique (traitement aspirine)',
          instructions: 'Prendre le matin à jeun',
        },
        {
          patientId: patient.id,
          medicationName: 'Amoxicilline',
          dosage: '1g',
          frequency: '3 fois par jour',
          route: 'Oral',
          startDate: new Date('2024-11-01'),
          endDate: new Date('2024-11-07'),
          status: 'STOPPED',
          indication: 'Infection bronchique',
          instructions: 'Arrêt suite allergie déclarée',
          notes: 'ALLERGIE - Ne plus prescrire',
        },
      ],
    });

    // MESURES BIOMÉTRIQUES
    const biometricDates = [
      new Date('2025-11-15'),
      new Date('2025-08-20'),
      new Date('2025-05-10'),
      new Date('2025-02-01'),
      new Date('2024-11-05'),
      new Date('2024-08-15'),
    ];

    for (let i = 0; i < biometricDates.length; i++) {
      const date = biometricDates[i];
      await prisma.biometricMeasurement.createMany({
        data: [
          {
            patientId: patient.id,
            doctorId: doctor1.id,
            type: 'WEIGHT',
            value: 75 + (i * 0.5) - Math.random() * 2,
            unit: 'kg',
            measuredAt: date,
            notes: i === 0 ? 'Poids stable' : undefined,
          },
          {
            patientId: patient.id,
            doctorId: doctor1.id,
            type: 'BLOOD_PRESSURE',
            value: 125 + Math.floor(Math.random() * 15) - 5,
            valueSecondary: 78 + Math.floor(Math.random() * 10) - 5,
            unit: 'mmHg',
            measuredAt: date,
          },
          {
            patientId: patient.id,
            doctorId: doctor1.id,
            type: 'HEART_RATE',
            value: 68 + Math.floor(Math.random() * 12) - 6,
            unit: 'bpm',
            measuredAt: date,
          },
        ],
      });
    }

    // Mesures initiales (taille)
    await prisma.biometricMeasurement.create({
      data: {
        patientId: patient.id,
        doctorId: doctor1.id,
        type: 'HEIGHT',
        value: 172,
        unit: 'cm',
        measuredAt: new Date('2020-01-15'),
      },
    });

    // OBSERVATIONS CLINIQUES
    await prisma.clinicalObservation.createMany({
      data: [
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'GENERAL',
          title: 'Consultation de suivi cardiovasculaire',
          content: 'Patient en bon état général. Pas de dyspnée, pas de douleur thoracique. Auscultation cardiaque: BDC réguliers, pas de souffle. TA 128/78 mmHg. Pouls 72 bpm régulier.',
          observedAt: new Date('2025-11-15'),
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'EXAMINATION',
          title: 'ECG de contrôle',
          content: 'Rythme sinusal régulier à 70/min. Axe normal. Pas de trouble de la repolarisation. QT normal. Conclusion: ECG normal.',
          observedAt: new Date('2025-11-15'),
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'EVOLUTION',
          title: 'Bilan diabète',
          content: 'Diabète bien équilibré sous Metformine. Pas de signe de complication micro ou macroangiopathique. Fond d\'œil normal. Examen des pieds: pas de trouble trophique.',
          observedAt: new Date('2025-08-20'),
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'VITAL_SIGNS',
          title: 'Examen pulmonaire',
          content: 'Auscultation pulmonaire: murmure vésiculaire bilatéral symétrique. Pas de râle. Saturation 98% en air ambiant.',
          observedAt: new Date('2025-05-10'),
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'ALERT',
          title: 'Réaction allergique',
          content: 'Épisode urticarien diffus apparu 2h après prise d\'Amoxicilline. Traitement par antihistaminiques + corticoïdes. Évolution favorable en 48h. ALLERGIE À LA PÉNICILLINE CONFIRMÉE.',
          observedAt: new Date('2024-11-02'),
          isUrgent: true,
        },
      ],
    });

    // RÉSULTATS DE LABORATOIRE
    await prisma.labResult.createMany({
      data: [
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'HEMATOLOGY',
          testName: 'Numération Formule Sanguine (NFS)',
          value: JSON.stringify({
            hemoglobine: { value: 14.2, unit: 'g/dL', range: '12-16' },
            hematocrite: { value: 42, unit: '%', range: '36-46' },
            leucocytes: { value: 7.5, unit: 'G/L', range: '4-10' },
            plaquettes: { value: 245, unit: 'G/L', range: '150-400' },
          }),
          unit: 'multiple',
          isAbnormal: false,
          resultDate: new Date('2025-11-10'),
          labName: 'Laboratoire Biomédical Gabon',
          notes: 'Bilan sanguin normal',
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'BIOCHEMISTRY',
          testName: 'Bilan lipidique',
          value: JSON.stringify({
            cholesterol_total: { value: 1.95, unit: 'g/L', range: '<2.0' },
            ldl: { value: 1.15, unit: 'g/L', range: '<1.3' },
            hdl: { value: 0.52, unit: 'g/L', range: '>0.4' },
            triglycerides: { value: 1.40, unit: 'g/L', range: '<1.5' },
          }),
          unit: 'multiple',
          isAbnormal: false,
          resultDate: new Date('2025-11-10'),
          labName: 'Laboratoire Biomédical Gabon',
          notes: 'Bilan lipidique bien contrôlé sous statine',
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'BIOCHEMISTRY',
          testName: 'HbA1c (Hémoglobine glyquée)',
          value: '6.8',
          unit: '%',
          normalRange: '<7.0',
          isAbnormal: false,
          resultDate: new Date('2025-11-10'),
          labName: 'Laboratoire Biomédical Gabon',
          notes: 'Diabète bien équilibré',
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'BIOCHEMISTRY',
          testName: 'Créatinine',
          value: '85',
          unit: 'µmol/L',
          normalRange: '62-106',
          isAbnormal: false,
          resultDate: new Date('2025-11-10'),
          labName: 'Laboratoire Biomédical Gabon',
          notes: 'Fonction rénale normale (DFG > 90 mL/min)',
        },
        {
          patientId: patient.id,
          doctorId: doctor1.id,
          category: 'BIOCHEMISTRY',
          testName: 'Glycémie à jeun',
          value: '1.12',
          unit: 'g/L',
          normalRange: '0.70-1.10',
          isAbnormal: true,
          resultDate: new Date('2025-11-10'),
          labName: 'Laboratoire Biomédical Gabon',
          notes: 'Légèrement élevée mais HbA1c satisfaisante',
        },
      ],
    });

    // CONTACTS D'URGENCE
    await prisma.emergencyContact.createMany({
      data: [
        {
          patientId: patient.id,
          fullName: faker.person.fullName(),
          relationship: 'Époux(se)',
          phone: `+33 6 ${faker.string.numeric(2)} ${faker.string.numeric(2)} ${faker.string.numeric(2)} ${faker.string.numeric(2)}`,
          email: faker.internet.email(),
          isPrimary: true,
        },
        {
          patientId: patient.id,
          fullName: faker.person.fullName(),
          relationship: 'Parent',
          phone: `+33 6 ${faker.string.numeric(2)} ${faker.string.numeric(2)} ${faker.string.numeric(2)} ${faker.string.numeric(2)}`,
          isPrimary: false,
        },
      ],
    });

    // CONSENTEMENTS
    await prisma.patientConsent.createMany({
      data: [
        {
          patientId: patient.id,
          type: 'CARE',
          granted: true,
          grantedAt: new Date('2024-01-15'),
          ipAddress: '192.168.1.100',
        },
        {
          patientId: patient.id,
          type: 'DATA_SHARING',
          granted: true,
          grantedAt: new Date('2024-01-15'),
          ipAddress: '192.168.1.100',
        },
        {
          patientId: patient.id,
          type: 'TELECONSULTATION',
          granted: true,
          grantedAt: new Date('2024-03-20'),
          ipAddress: '192.168.1.102',
        },
        {
          patientId: patient.id,
          type: 'EMAIL_COMMUNICATION',
          granted: false,
        },
        {
          patientId: patient.id,
          type: 'RESEARCH',
          granted: true,
          grantedAt: new Date('2024-06-10'),
          ipAddress: '192.168.1.105',
        },
      ],
      skipDuplicates: true,
    });

  }

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
  console.log(`   💰 ${8} portefeuilles médecins`);
  console.log(`\n   📋 Dossiers patients (3 premiers patients):`);
  console.log(`      - ${7 * 3} antécédents médicaux`);
  console.log(`      - ${6 * 3} vaccinations`);
  console.log(`      - ${6 * 3} traitements`);
  console.log(`      - ${19 * 3} mesures biométriques`);
  console.log(`      - ${5 * 3} observations cliniques`);
  console.log(`      - ${5 * 3} résultats de laboratoire`);
  console.log(`      - ${2 * 3} contacts d'urgence`);
  console.log(`      - ${5 * 3} consentements\n`);

  console.log('🔑 Comptes de test (mot de passe: password123):');
  console.log('   Patients:');
  console.log('     - sylvie.moussavou@email.ga');
  console.log('     - jb.nzoghe@email.ga');
  console.log('     - carine.obame@email.ga');
  console.log('   Médecins:');
  console.log('     - dr.rahandi.chambrier@sante.ga (Cardiologue)');
  console.log('     - dr.marceline.alawe@sante.ga (Gynécologue)');
  console.log('     - dr.urbain.alawoe@sante.ga (Généraliste Owendo)');
  console.log('     - pr.minkobame@sante.ga (Neurologue)');
  console.log('     - dr.carole@sante.ga (Pédiatre)');
  console.log('     - dr.gilles@sante.ga (Chirurgien)');
  console.log('     - dr.marius@sante.ga (Interniste)');
  console.log('     - dr.chitou@sante.ga (Dermatologue)');
  console.log('     - dr.kedy@sante.ga (Ophtalmologue)');
  console.log('     - dr.nesta@sante.ga (Généraliste)\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
