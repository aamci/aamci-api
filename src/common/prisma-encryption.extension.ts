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

/**
 * Champs de relation (nom du champ dans le résultat) → modèle cible.
 * Permet de déchiffrer récursivement les relations incluses (include: {}).
 */
const RELATION_FIELD_TO_MODEL: Record<string, string> = {
  patientProfile:   'patientProfile',
  healthRecord:     'healthRecord',
  emergencyContact: 'emergencyContact',
  emergencyContacts:'emergencyContact',
  medicalNote:      'medicalNote',
  medicalNotes:     'medicalNote',
  consultation:     'consultation',
  consultations:    'consultation',
  prescription:     'prescription',
  prescriptions:    'prescription',
  message:          'message',
  messages:         'message',
  sentMessages:     'message',
  receivedMessages: 'message',
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

  if (Array.isArray(result)) {
    return result.map((r) => decryptAfterRead(model, r, encryption));
  }

  const lowerModel = model.charAt(0).toLowerCase() + model.slice(1);
  const stringFields = ENCRYPTED_STRING_FIELDS[lowerModel] ?? [];
  const jsonFields = ENCRYPTED_JSON_FIELDS[lowerModel] ?? [];

  // Vérifier si ce résultat contient des relations chiffrées incluses
  // On ne considère comme relation que les champs qui sont des objets (pas des primitives string/number/bool)
  const hasNestedRelations = Object.keys(RELATION_FIELD_TO_MODEL).some(
    (f) => result[f] != null && typeof result[f] === 'object',
  );

  // Rien à faire : pas de champs chiffrés propres et pas de relations incluses
  if (stringFields.length === 0 && jsonFields.length === 0 && !hasNestedRelations) {
    return result;
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

  // Déchiffrer récursivement les relations incluses (ex: user.findUnique({ include: { patientProfile: true } }))
  // On ne traite que les champs qui sont des objets (pas des primitives — ex: notification.message est une string, pas une relation)
  for (const [fieldName, relatedModel] of Object.entries(RELATION_FIELD_TO_MODEL)) {
    if (decrypted[fieldName] != null && typeof decrypted[fieldName] === 'object') {
      decrypted[fieldName] = decryptAfterRead(relatedModel, decrypted[fieldName], encryption);
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

  if (Array.isArray(result)) {
    const allJobs: ReencryptJob[] = [];
    const decryptedArray = result.map((r) => {
      const { decrypted, jobs: j } = decryptAfterReadWithJobs(model, r, encryption);
      allJobs.push(...j);
      return decrypted;
    });
    return { decrypted: decryptedArray, jobs: allJobs };
  }

  const lowerModel = model.charAt(0).toLowerCase() + model.slice(1);
  const stringFields = ENCRYPTED_STRING_FIELDS[lowerModel] ?? [];
  const jsonFields = ENCRYPTED_JSON_FIELDS[lowerModel] ?? [];

  const hasNestedRelations = Object.keys(RELATION_FIELD_TO_MODEL).some(
    (f) => result[f] != null && typeof result[f] === 'object',
  );

  if (stringFields.length === 0 && jsonFields.length === 0 && !hasNestedRelations) {
    return { decrypted: result, jobs };
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

  // Déchiffrer récursivement les relations incluses (objets uniquement, pas les primitives)
  for (const [fieldName, relatedModel] of Object.entries(RELATION_FIELD_TO_MODEL)) {
    if (decrypted[fieldName] != null && typeof decrypted[fieldName] === 'object') {
      decrypted[fieldName] = decryptAfterRead(relatedModel, decrypted[fieldName], encryption);
    }
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
