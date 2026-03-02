import { EncryptionService } from './encryption.service';

/**
 * Champs sensibles par modèle Prisma (minuscule = nom du modèle Prisma)
 */
const ENCRYPTED_STRING_FIELDS: Record<string, string[]> = {
  patientProfile: [
    'birthLastName',
    'usageLastName',
    'firstName',
    'usualFirstName',
    'birthPlace',
    'birthCountry',
    'addressLine1',
    'postalCode',
    'socialSecurityNumber',
    'insuranceProvider',
    'mutualInsurance',
    'primaryDoctorName',
    'bloodGroup',
  ],
  medicalNote: ['title', 'content'],
  message: ['content'],
  consultation: ['motif', 'interrogatoire', 'examen', 'notes'],
  prescription: ['diagnosis', 'generalInstructions', 'notes'],
  emergencyContact: ['fullName', 'phone', 'phoneSecondary', 'email'],
  healthRecord: ['notes'],
};

/**
 * Champs JSON à chiffrer après sérialisation (JSON.stringify → encrypt)
 */
const ENCRYPTED_JSON_FIELDS: Record<string, string[]> = {
  healthRecord: [
    'allergyDetails',
    'medicalHistory',
    'surgicalHistory',
    'familyHistory',
    'currentMedications',
    'vaccinationRecord',
  ],
};

/** Regex de détection d'un champ déjà chiffré (format iv:tag:data) */
const ENCRYPTED_PATTERN = /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:.+$/;

function isEncrypted(value: string): boolean {
  return ENCRYPTED_PATTERN.test(value);
}

/**
 * Chiffre les champs sensibles d'un objet avant écriture en base.
 * Appelé depuis le middleware Prisma avant les opérations create/update/upsert.
 */
export function encryptBeforeWrite(
  model: string,
  data: any,
  encryption: EncryptionService,
): any {
  if (!data || typeof data !== 'object') return data;

  const lowerModel = model.charAt(0).toLowerCase() + model.slice(1);
  const stringFields = ENCRYPTED_STRING_FIELDS[lowerModel] ?? [];
  const jsonFields = ENCRYPTED_JSON_FIELDS[lowerModel] ?? [];

  if (stringFields.length === 0 && jsonFields.length === 0) return data;

  const encrypted = { ...data };

  for (const field of stringFields) {
    const value = encrypted[field];
    if (value && typeof value === 'string' && !isEncrypted(value)) {
      encrypted[field] = encryption.encrypt(value);
    }
  }

  for (const field of jsonFields) {
    const value = encrypted[field];
    if (value !== undefined && value !== null) {
      const stringified =
        typeof value === 'string' ? value : JSON.stringify(value);
      if (!isEncrypted(stringified)) {
        encrypted[field] = encryption.encrypt(stringified);
      }
    }
  }

  return encrypted;
}

/**
 * Déchiffre les champs sensibles d'un résultat après lecture de la base.
 */
export function decryptAfterRead(
  model: string,
  result: any,
  encryption: EncryptionService,
): any {
  if (!result) return result;

  const lowerModel = model.charAt(0).toLowerCase() + model.slice(1);
  const stringFields = ENCRYPTED_STRING_FIELDS[lowerModel] ?? [];
  const jsonFields = ENCRYPTED_JSON_FIELDS[lowerModel] ?? [];

  if (stringFields.length === 0 && jsonFields.length === 0) return result;

  if (Array.isArray(result)) {
    return result.map((r) => decryptAfterRead(model, r, encryption));
  }

  const decrypted = { ...result };

  for (const field of stringFields) {
    const value = decrypted[field];
    if (value && typeof value === 'string' && isEncrypted(value)) {
      try {
        decrypted[field] = encryption.decrypt(value);
      } catch {
        // Laisser la valeur chiffrée en cas d'erreur (clé changée, etc.)
      }
    }
  }

  for (const field of jsonFields) {
    const value = decrypted[field];
    if (value && typeof value === 'string' && isEncrypted(value)) {
      try {
        const decryptedStr = encryption.decrypt(value);
        try {
          decrypted[field] = JSON.parse(decryptedStr);
        } catch {
          decrypted[field] = decryptedStr;
        }
      } catch {
        // Laisser tel quel
      }
    }
  }

  return decrypted;
}

export interface ReencryptJob {
  id: string;
  data: Record<string, string>; // champ → nouvelle valeur chiffrée
}

/**
 * Variante de decryptAfterRead pour la rotation paresseuse.
 * Retourne le résultat déchiffré + les jobs de re-chiffrement à appliquer
 * pour les champs encore chiffrés avec l'ancienne clé.
 */
export function decryptAfterReadWithJobs(
  model: string,
  result: any,
  encryption: EncryptionService,
): { decrypted: any; jobs: ReencryptJob[] } {
  const jobs: ReencryptJob[] = [];

  if (!result) return { decrypted: result, jobs };

  const lowerModel = model.charAt(0).toLowerCase() + model.slice(1);
  const stringFields = ENCRYPTED_STRING_FIELDS[lowerModel] ?? [];
  const jsonFields = ENCRYPTED_JSON_FIELDS[lowerModel] ?? [];

  if (stringFields.length === 0 && jsonFields.length === 0) return { decrypted: result, jobs };

  if (Array.isArray(result)) {
    const allJobs: ReencryptJob[] = [];
    const decryptedArray = result.map((r) => {
      const { decrypted, jobs: j } = decryptAfterReadWithJobs(model, r, encryption);
      allJobs.push(...j);
      return decrypted;
    });
    return { decrypted: decryptedArray, jobs: allJobs };
  }

  const decrypted = { ...result };
  const jobData: Record<string, string> = {};

  for (const field of stringFields) {
    const value = decrypted[field];
    if (value && typeof value === 'string' && isEncrypted(value)) {
      try {
        const { plaintext, usedOldKey } = encryption.decryptBestEffort(value);
        decrypted[field] = plaintext;
        if (usedOldKey) {
          jobData[field] = encryption.encrypt(plaintext);
        }
      } catch {
        // laisser la valeur chiffrée
      }
    }
  }

  for (const field of jsonFields) {
    const value = decrypted[field];
    if (value && typeof value === 'string' && isEncrypted(value)) {
      try {
        const { plaintext, usedOldKey } = encryption.decryptBestEffort(value);
        try {
          decrypted[field] = JSON.parse(plaintext);
        } catch {
          decrypted[field] = plaintext;
        }
        if (usedOldKey) {
          jobData[field] = encryption.encrypt(plaintext);
        }
      } catch {
        // laisser tel quel
      }
    }
  }

  if (Object.keys(jobData).length > 0 && result.id) {
    jobs.push({ id: result.id, data: jobData });
  }

  return { decrypted, jobs };
}

/**
 * Retourne la liste des modèles et champs couverts par le chiffrement.
 * Utilisé par l'endpoint /admin/encryption/status
 */
export function getEncryptionCoverage(): Record<string, { string: string[]; json: string[] }> {
  const coverage: Record<string, { string: string[]; json: string[] }> = {};
  for (const model of new Set([
    ...Object.keys(ENCRYPTED_STRING_FIELDS),
    ...Object.keys(ENCRYPTED_JSON_FIELDS),
  ])) {
    coverage[model] = {
      string: ENCRYPTED_STRING_FIELDS[model] ?? [],
      json: ENCRYPTED_JSON_FIELDS[model] ?? [],
    };
  }
  return coverage;
}
