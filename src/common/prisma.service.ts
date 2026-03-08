import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from './encryption.service';
import { encryptBeforeWrite, decryptAfterRead, decryptAfterReadWithJobs } from './prisma-encryption.extension';

const WRITE_ACTIONS = new Set(['create', 'update', 'upsert', 'createMany', 'updateMany']);
// READ_ACTIONS includes write operations whose result must also be decrypted
const READ_ACTIONS = new Set(['findUnique', 'findFirst', 'findMany', 'findUniqueOrThrow', 'findFirstOrThrow', 'create', 'update', 'upsert']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  /** Client brut (sans $extends) utilisé uniquement pour les re-chiffrements asynchrones. */
  private rawPrisma: PrismaClient | null = null;

  async onModuleInit() {
    if (process.env.PRISMA_CONNECT_ON_BOOT === 'true') {
      try {
        await this.$connect();
        this.logger.log('Prisma connected');
      } catch (e) {
        this.logger.error('Prisma connect failed (non-fatal at boot)', e as any);
      }
    } else {
      this.logger.warn('Skipping Prisma connect on boot (PRISMA_CONNECT_ON_BOOT != true)');
    }

    // Chiffrement transparent — activé si ENCRYPTION_KEY est définie dans l'environnement
    // Prisma v6 : utilise $extends à la place du middleware $use (deprecated/removed)
    if (process.env.ENCRYPTION_KEY) {
      const encryption = new EncryptionService();
      const hasOldKey = encryption.hasOldKey();

      // Client brut pour les écritures de re-chiffrement (évite la récursion dans $extends)
      if (hasOldKey) {
        this.rawPrisma = new PrismaClient();
        this.logger.log('Key rotation in progress — lazy re-encryption enabled');
      }

      const rawPrisma = this.rawPrisma;
      const logger = this.logger;

      const extended = (this as any).$extends({
        query: {
          $allModels: {
            async $allOperations({ operation, model, args, query }: {
              operation: string;
              model: string;
              args: any;
              query: (args: any) => Promise<any>;
            }) {
              // Chiffrer avant écriture
              if (WRITE_ACTIONS.has(operation) && args?.data) {
                args.data = encryptBeforeWrite(model, args.data, encryption);
              }
              const result = await query(args);
              // Déchiffrer après lecture
              if (READ_ACTIONS.has(operation)) {
                if (hasOldKey && rawPrisma) {
                  // Rotation paresseuse : déchiffre avec meilleure clé disponible,
                  // re-chiffre en arrière-plan les champs encore chiffrés avec l'ancienne clé
                  const { decrypted, jobs } = decryptAfterReadWithJobs(model, result, encryption);
                  if (jobs.length > 0) {
                    const modelDelegate = (rawPrisma as any)[model.charAt(0).toLowerCase() + model.slice(1)];
                    Promise.allSettled(
                      jobs.map((job) =>
                        modelDelegate?.update({ where: { id: job.id }, data: job.data })
                      )
                    ).then((results) => {
                      const errors = results.filter((r) => r.status === 'rejected');
                      if (errors.length > 0) {
                        logger.warn(`Lazy re-encryption: ${errors.length} error(s) on model ${model}`);
                      } else {
                        logger.debug(`Lazy re-encryption: ${jobs.length} record(s) updated on model ${model}`);
                      }
                    });
                  }
                  return decrypted;
                }
                return decryptAfterRead(model, result, encryption);
              }
              return result;
            },
          },
        },
      });
      // Copie les délégués de modèle étendus vers this pour transparence
      Object.assign(this, extended);
      this.logger.log('Encryption middleware activated for sensitive models');
    } else {
      this.logger.warn('ENCRYPTION_KEY not set — encryption middleware disabled');
    }
  }
}
