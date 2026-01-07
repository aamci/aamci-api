import { Prisma } from '@prisma/client';
import { EncryptionService } from './encryption.service';

/**
 * Extension Prisma pour chiffrer/déchiffrer automatiquement les champs sensibles
 *
 * Utilisation:
 * const prisma = new PrismaClient().$extends(createEncryptionExtension(encryptionService));
 */
export function createEncryptionExtension(encryption: EncryptionService) {
  return Prisma.defineExtension({
    name: 'encryption',
    query: {
      patientProfile: {
        // Chiffrer avant CREATE
        async create({ args, query }) {
          if (args.data) {
            args.data = encryptPatientProfileFields(args.data, encryption);
          }
          const result = await query(args);
          return decryptPatientProfileFields(result, encryption);
        },

        // Chiffrer avant UPDATE
        async update({ args, query }) {
          if (args.data) {
            args.data = encryptPatientProfileFields(args.data, encryption);
          }
          const result = await query(args);
          return decryptPatientProfileFields(result, encryption);
        },

        // Déchiffrer après FIND
        async findUnique({ args, query }) {
          const result = await query(args);
          return result ? decryptPatientProfileFields(result, encryption) : result;
        },

        async findFirst({ args, query }) {
          const result = await query(args);
          return result ? decryptPatientProfileFields(result, encryption) : result;
        },

        async findMany({ args, query }) {
          const results = await query(args);
          return results.map(r => decryptPatientProfileFields(r, encryption));
        },
      },
      medicalNote: {
        // Chiffrer les notes médicales
        async create({ args, query }) {
          if (args.data) {
            if (args.data.content) {
              args.data.content = encryption.encrypt(args.data.content);
            }
            if (args.data.title) {
              args.data.title = encryption.encrypt(args.data.title);
            }
          }
          const result = await query(args);
          return decryptMedicalNoteFields(result, encryption);
        },

        async update({ args, query }) {
          if (args.data) {
            if (args.data.content) {
              args.data.content = encryption.encrypt(args.data.content as string);
            }
            if (args.data.title) {
              args.data.title = encryption.encrypt(args.data.title as string);
            }
          }
          const result = await query(args);
          return decryptMedicalNoteFields(result, encryption);
        },

        async findUnique({ args, query }) {
          const result = await query(args);
          return result ? decryptMedicalNoteFields(result, encryption) : result;
        },

        async findFirst({ args, query }) {
          const result = await query(args);
          return result ? decryptMedicalNoteFields(result, encryption) : result;
        },

        async findMany({ args, query }) {
          const results = await query(args);
          return results.map(r => decryptMedicalNoteFields(r, encryption));
        },
      },
    },
  });
}

/**
 * Liste des champs sensibles du PatientProfile à chiffrer
 */
const SENSITIVE_PATIENT_FIELDS = [
  'birthLastName',
  'usageLastName',
  'firstName',
  'usualFirstName',
  'birthPlace',
  'birthCountry',
  'addressLine1',
  'postalCode',
  'socialSecurityNumber',  // Très sensible!
  'insuranceProvider',
  'mutualInsurance',
  'primaryDoctorName',
  'bloodGroup',
] as const;

/**
 * Chiffre les champs sensibles du PatientProfile
 */
function encryptPatientProfileFields(data: any, encryption: EncryptionService): any {
  const encrypted = { ...data };

  for (const field of SENSITIVE_PATIENT_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encryption.encrypt(encrypted[field]);
    }
  }

  // Pour le numéro de sécu, on peut aussi créer un hash pour recherche
  // (sans révéler le vrai numéro)
  if (data.socialSecurityNumber) {
    encrypted.socialSecurityNumberHash = encryption.hash(data.socialSecurityNumber);
  }

  return encrypted;
}

/**
 * Déchiffre les champs sensibles du PatientProfile
 */
function decryptPatientProfileFields(data: any, encryption: EncryptionService): any {
  if (!data) return data;

  const decrypted = { ...data };

  for (const field of SENSITIVE_PATIENT_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = encryption.decrypt(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // En cas d'erreur, on laisse la valeur chiffrée
      }
    }
  }

  return decrypted;
}

/**
 * Déchiffre les champs des notes médicales
 */
function decryptMedicalNoteFields(data: any, encryption: EncryptionService): any {
  if (!data) return data;

  const decrypted = { ...data };

  // Déchiffrer le contenu
  if (decrypted.content) {
    try {
      decrypted.content = encryption.decrypt(decrypted.content);
    } catch (error) {
      console.error('Failed to decrypt medical note content:', error);
    }
  }

  // Déchiffrer le titre
  if (decrypted.title) {
    try {
      decrypted.title = encryption.decrypt(decrypted.title);
    } catch (error) {
      console.error('Failed to decrypt medical note title:', error);
    }
  }

  return decrypted;
}
