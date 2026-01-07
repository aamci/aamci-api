import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class DatabaseHealthService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.checkDatabaseHealth();
  }

  /**
   * Vérifie la santé de la base de données au démarrage
   */
  async checkDatabaseHealth(): Promise<void> {
    try {
      // Test de connexion basique
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection successful');

      // Vérifier que les tables essentielles existent
      await this.checkRequiredTables();

      // Vérifier que les colonnes essentielles existent sur User
      await this.checkUserTableSchema();

      this.logger.log('✅ Database schema validation successful');
    } catch (error) {
      this.logger.error('❌ Database health check failed:', error.message);

      // En production, on veut que l'app démarre quand même mais log l'erreur
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'CRITICAL: Database schema issues detected in production. Application will continue but may experience errors.',
        );
        this.logger.error(
          'ACTION REQUIRED: Run "prisma migrate deploy" or contact DevOps team',
        );
      } else {
        // En développement, on peut être plus strict
        this.logger.warn(
          'Database schema issues detected. Run "pnpm prisma db push" to sync.',
        );
      }
    }
  }

  /**
   * Vérifie que les tables essentielles existent
   */
  private async checkRequiredTables(): Promise<void> {
    const requiredTables = [
      'User',
      'DoctorProfile',
      'PatientProfile',
      'Appointment',
      'AvailabilitySlot',
      'Transaction',
      'Wallet',
    ];

    for (const table of requiredTables) {
      try {
        // Essayer de compter les lignes (vérifie que la table existe)
        await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM "${table}"`);
      } catch (error) {
        this.logger.error(`❌ Table "${table}" does not exist or is inaccessible`);
        throw new Error(`Missing required table: ${table}`);
      }
    }

    this.logger.log(`✅ All required tables exist`);
  }

  /**
   * Vérifie le schéma de la table User (colonnes critiques)
   */
  private async checkUserTableSchema(): Promise<void> {
    try {
      // Requête PostgreSQL pour obtenir les colonnes de la table User
      const columns: any[] = await this.prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'User'
      `;

      const columnNames = columns.map((col) => col.column_name);

      // Colonnes essentielles qui doivent exister
      const requiredColumns = [
        'id',
        'email',
        'password',
        'role',
        'emailVerified',
        'verificationToken',
        'tokenExpiry',
        'createdAt',
        'updatedAt',
      ];

      const missingColumns = requiredColumns.filter(
        (col) => !columnNames.includes(col),
      );

      if (missingColumns.length > 0) {
        this.logger.error(
          `❌ User table is missing columns: ${missingColumns.join(', ')}`,
        );
        throw new Error(
          `User table schema is incomplete. Missing: ${missingColumns.join(', ')}`,
        );
      }

      this.logger.log('✅ User table schema is valid');
    } catch (error) {
      if (error.message.includes('Missing')) {
        throw error;
      }
      this.logger.error('Failed to validate User table schema:', error.message);
      throw new Error('Could not validate User table schema');
    }
  }

  /**
   * Health check endpoint - peut être appelé via HTTP
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    database: 'connected' | 'disconnected';
    timestamp: string;
    details?: any;
  }> {
    try {
      // Test de connexion
      await this.prisma.$queryRaw`SELECT 1`;

      // Compter les utilisateurs (test de lecture)
      const userCount = await this.prisma.user.count();

      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        details: {
          userCount,
          databaseUrl: this.maskDatabaseUrl(process.env.DATABASE_URL),
        },
      };
    } catch (error) {
      this.logger.error('Health check failed:', error.message);
      return {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Masque les informations sensibles de l'URL de base de données
   */
  private maskDatabaseUrl(url?: string): string {
    if (!url) return 'not configured';

    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.username}:****@${parsed.host}${parsed.pathname}`;
    } catch {
      return 'invalid url';
    }
  }
}
