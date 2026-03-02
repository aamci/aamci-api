/**
 * Script de migration : chiffre les données sensibles existantes en base.
 *
 * IMPORTANT : Définir ENCRYPTION_KEY dans l'environnement avant d'exécuter.
 * Usage : npx ts-node -r tsconfig-paths/register prisma/migrate-encrypt.ts
 *
 * Le script est idempotent : les champs déjà chiffrés (format iv:tag:data) sont ignorés.
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

// ─── Helpers encryption inline (sans dépendance NestJS) ──────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTED_PATTERN = /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:.+$/;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY doit être définie dans l\'environnement');
  return Buffer.from(key, 'base64');
}

function encrypt(text: string): string {
  if (!text) return text;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
}

function isEncrypted(value: string): boolean {
  return ENCRYPTED_PATTERN.test(value);
}

// ─── Config des champs à chiffrer ─────────────────────────────────────────────

const STRING_FIELDS: Record<string, string[]> = {
  patientProfile: [
    'birthLastName', 'usageLastName', 'firstName', 'usualFirstName',
    'birthPlace', 'birthCountry', 'addressLine1', 'postalCode',
    'socialSecurityNumber', 'insuranceProvider', 'mutualInsurance',
    'primaryDoctorName', 'bloodGroup',
  ],
  medicalNote: ['title', 'content'],
  message: ['content'],
  consultation: ['motif', 'interrogatoire', 'examen', 'notes'],
  prescription: ['diagnosis', 'generalInstructions', 'notes'],
  emergencyContact: ['fullName', 'phone', 'phoneSecondary', 'email'],
  healthRecord: ['notes'],
};

const JSON_FIELDS: Record<string, string[]> = {
  healthRecord: [
    'allergyDetails', 'medicalHistory', 'surgicalHistory',
    'familyHistory', 'currentMedications', 'vaccinationRecord',
  ],
};

const BATCH_SIZE = 100;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function migrateModel(
  prisma: PrismaClient,
  modelName: string,
  stringFields: string[],
  jsonFields: string[],
) {
  const model = (prisma as any)[modelName];
  if (!model) {
    console.warn(`  [SKIP] Modèle "${modelName}" introuvable dans Prisma`);
    return;
  }

  let cursor: string | undefined;
  let totalMigrated = 0;
  let totalSkipped = 0;

  while (true) {
    const records = await model.findMany({
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
    });

    if (records.length === 0) break;
    cursor = records[records.length - 1].id;

    for (const record of records) {
      const updates: Record<string, any> = {};
      let needsUpdate = false;

      for (const field of stringFields) {
        const value = record[field];
        if (value && typeof value === 'string' && !isEncrypted(value)) {
          updates[field] = encrypt(value);
          needsUpdate = true;
        }
      }

      for (const field of jsonFields) {
        const value = record[field];
        if (value !== null && value !== undefined) {
          const str = typeof value === 'string' ? value : JSON.stringify(value);
          if (!isEncrypted(str)) {
            updates[field] = encrypt(str);
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        await model.update({ where: { id: record.id }, data: updates });
        totalMigrated++;
      } else {
        totalSkipped++;
      }
    }
  }

  console.log(`  [${modelName}] Migrés: ${totalMigrated} | Déjà chiffrés/ignorés: ${totalSkipped}`);
}

async function main() {
  console.log('=== Migration de chiffrement AES-256-GCM ===\n');

  if (!process.env.ENCRYPTION_KEY) {
    console.error('ERREUR : ENCRYPTION_KEY non définie. Arrêt.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('Connexion DB OK\n');

    for (const [modelName, fields] of Object.entries(STRING_FIELDS)) {
      const jsonFieldsForModel = JSON_FIELDS[modelName] ?? [];
      console.log(`→ Migration ${modelName}...`);
      await migrateModel(prisma, modelName, fields, jsonFieldsForModel);
    }

    console.log('\n✓ Migration terminée avec succès.');
    console.log('IMPORTANT : Vérifiez en base que les champs sensibles sont illisibles.');
  } catch (err) {
    console.error('ERREUR durant la migration :', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
