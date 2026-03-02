/**
 * Script de rotation de clé de chiffrement AES-256-GCM.
 *
 * Déchiffre toutes les données sensibles avec l'ANCIENNE clé
 * et les re-chiffre avec la NOUVELLE clé, en un seul passage.
 *
 * Usage :
 *   OLD_ENCRYPTION_KEY=<ancienne_clé_base64> \
 *   NEW_ENCRYPTION_KEY=<nouvelle_clé_base64> \
 *   npx ts-node -r tsconfig-paths/register prisma/rotate-key.ts
 *
 * Générer une nouvelle clé :
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTED_PATTERN = /^[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*:.+$/;
const BATCH_SIZE = 100;

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function loadKeys(): { oldKey: Buffer; newKey: Buffer } {
  const oldRaw = process.env.OLD_ENCRYPTION_KEY;
  const newRaw = process.env.NEW_ENCRYPTION_KEY;
  if (!oldRaw) throw new Error('OLD_ENCRYPTION_KEY non définie');
  if (!newRaw) throw new Error('NEW_ENCRYPTION_KEY non définie');
  return {
    oldKey: Buffer.from(oldRaw, 'base64'),
    newKey: Buffer.from(newRaw, 'base64'),
  };
}

function decrypt(encryptedValue: string, key: Buffer): string {
  const parts = encryptedValue.split(':');
  if (parts.length !== 3) throw new Error('Format chiffré invalide (attendu iv:tag:data)');
  const iv  = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const data = Buffer.from(parts[2], 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(text, 'utf8', 'base64');
  enc += cipher.final('base64');
  return `${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${enc}`;
}

function isEncrypted(value: string): boolean {
  return ENCRYPTED_PATTERN.test(value);
}

// ─── Config des champs (identique à prisma-encryption.extension.ts) ───────────

const STRING_FIELDS: Record<string, string[]> = {
  patientProfile: [
    'birthLastName', 'usageLastName', 'firstName', 'usualFirstName',
    'birthPlace', 'birthCountry', 'addressLine1', 'postalCode',
    'socialSecurityNumber', 'insuranceProvider', 'mutualInsurance',
    'primaryDoctorName', 'bloodGroup',
  ],
  medicalNote:      ['title', 'content'],
  message:          ['content'],
  consultation:     ['motif', 'interrogatoire', 'examen', 'notes'],
  prescription:     ['diagnosis', 'generalInstructions', 'notes'],
  emergencyContact: ['fullName', 'phone', 'phoneSecondary', 'email'],
  healthRecord:     ['notes'],
};

const JSON_FIELDS: Record<string, string[]> = {
  healthRecord: [
    'allergyDetails', 'medicalHistory', 'surgicalHistory',
    'familyHistory', 'currentMedications', 'vaccinationRecord',
  ],
};

// ─── Rotation d'un modèle en batches ─────────────────────────────────────────

async function rotateModel(
  prisma: PrismaClient,
  modelName: string,
  stringFields: string[],
  jsonFields: string[],
  oldKey: Buffer,
  newKey: Buffer,
): Promise<{ rotated: number; skipped: number; errors: number }> {
  const model = (prisma as any)[modelName];
  if (!model) {
    console.warn(`  [SKIP] Modèle "${modelName}" introuvable`);
    return { rotated: 0, skipped: 0, errors: 0 };
  }

  let cursor: string | undefined;
  let rotated = 0;
  let skipped = 0;
  let errors  = 0;

  while (true) {
    const records: any[] = await model.findMany({
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
      let hasError    = false;

      const allFields = [
        ...stringFields.map(f => ({ field: f, isJson: false })),
        ...jsonFields.map(f  => ({ field: f, isJson: true  })),
      ];

      for (const { field, isJson } of allFields) {
        const value = record[field];
        // Champ vide ou non chiffré → ignorer
        if (!value) continue;
        const raw = typeof value === 'string' ? value : JSON.stringify(value);
        if (!isEncrypted(raw)) continue;

        try {
          const plaintext = decrypt(raw, oldKey);
          updates[field]  = encrypt(plaintext, newKey);
          needsUpdate     = true;
        } catch (err) {
          console.error(
            `    [ERR] ${modelName}#${record.id}.${field}: ${(err as Error).message}`,
          );
          hasError = true;
        }
      }

      if (hasError) {
        errors++;
        continue; // ne pas écrire un enregistrement partiellement converti
      }

      if (needsUpdate) {
        await model.update({ where: { id: record.id }, data: updates });
        rotated++;
      } else {
        skipped++;
      }
    }
  }

  return { rotated, skipped, errors };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Rotation de clé AES-256-GCM — Health API   ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Charger et valider les clés
  let oldKey: Buffer;
  let newKey: Buffer;
  try {
    ({ oldKey, newKey } = loadKeys());
  } catch (err) {
    console.error(`ERREUR : ${(err as Error).message}`);
    console.error('Usage : OLD_ENCRYPTION_KEY=... NEW_ENCRYPTION_KEY=... npx ts-node ...');
    process.exit(1);
  }

  if (oldKey.equals(newKey)) {
    console.error('ERREUR : Les deux clés sont identiques — aucune rotation nécessaire.');
    process.exit(1);
  }

  console.log(`Ancienne clé : ${process.env.OLD_ENCRYPTION_KEY!.slice(0, 8)}...`);
  console.log(`Nouvelle clé : ${process.env.NEW_ENCRYPTION_KEY!.slice(0, 8)}...`);
  console.log(`Batch size   : ${BATCH_SIZE} enregistrements\n`);

  // 2. Connexion DB
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✓ Connexion DB OK\n');

  // 3. Rotation modèle par modèle
  const report: Array<{ model: string } & ReturnType<typeof rotateModel> extends Promise<infer R> ? { model: string } & R : never> = [];
  let totalErrors = 0;

  try {
    for (const [modelName, fields] of Object.entries(STRING_FIELDS)) {
      const jsonFieldsForModel = JSON_FIELDS[modelName] ?? [];
      process.stdout.write(`→ ${modelName.padEnd(20)}`);
      const result = await rotateModel(prisma, modelName, fields, jsonFieldsForModel, oldKey, newKey);
      console.log(`rotation=${result.rotated}  sans_données=${result.skipped}  erreurs=${result.errors}`);
      (report as any[]).push({ model: modelName, ...result });
      totalErrors += result.errors;
    }
  } finally {
    await prisma.$disconnect();
  }

  // 4. Rapport final
  console.log('\n══════════════════════════════════════════════');
  console.log('RAPPORT DE ROTATION');
  console.log('══════════════════════════════════════════════');
  const totalRotated = (report as any[]).reduce((s: number, r: any) => s + r.rotated, 0);
  const totalSkipped = (report as any[]).reduce((s: number, r: any) => s + r.skipped, 0);
  for (const r of report as any[]) {
    const status = r.errors > 0 ? '⚠' : '✓';
    console.log(`  ${status} ${r.model.padEnd(20)} rotated=${r.rotated}  skipped=${r.skipped}  errors=${r.errors}`);
  }
  console.log(`\n  Total re-chiffrés : ${totalRotated}`);
  console.log(`  Total ignorés     : ${totalSkipped}`);
  console.log(`  Total erreurs     : ${totalErrors}`);

  if (totalErrors > 0) {
    console.log('\n⚠️  Des erreurs se sont produites (enregistrements déjà avec la nouvelle clé ?).');
    console.log('   Ces enregistrements n\'ont PAS été modifiés (sécurité).');
    console.log('   Vérifiez les logs et relancez si nécessaire.');
    process.exit(1);
  }

  console.log('\n✅ Rotation terminée avec succès.\n');
  console.log('PROCHAINES ÉTAPES :');
  console.log('  1. Mettre à jour  ENCRYPTION_KEY=<nouvelle_clé>  dans vos variables d\'env');
  console.log('  2. Redémarrer l\'API');
  console.log('  3. Tester que les données sont lisibles normalement');
  console.log('  4. Archiver l\'ancienne clé en lieu sûr (vault, gestionnaire de secrets)');
  console.log('  5. Supprimer OLD_ENCRYPTION_KEY de l\'environnement\n');
}

main().catch((err) => {
  console.error('\nERREUR fatale :', err);
  process.exit(1);
});
