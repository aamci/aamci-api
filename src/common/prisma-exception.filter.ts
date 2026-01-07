import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log l'erreur complète pour debugging
    this.logger.error(
      `Prisma error [${exception.code}]: ${exception.message}`,
      exception.stack,
    );

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let userMessage = 'Une erreur inattendue est survenue. Veuillez réessayer.';

    switch (exception.code) {
      // Contrainte unique violée
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        const field = target[0] || 'field';
        message = `Unique constraint failed on ${field}`;
        userMessage = `Cette valeur existe déjà pour le champ ${field}`;
        break;
      }

      // Enregistrement non trouvé
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        userMessage = 'Enregistrement introuvable';
        break;
      }

      // Contrainte de clé étrangère violée
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        const field = (exception.meta?.field_name as string) || 'field';
        message = `Foreign key constraint failed on ${field}`;
        userMessage = `Référence invalide pour le champ ${field}`;
        break;
      }

      // Colonne manquante (problème de schéma)
      case 'P2010': {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Database schema is out of sync';
        userMessage =
          'Le service est temporairement indisponible. Veuillez contacter le support.';
        this.logger.error(
          'CRITICAL: Database schema mismatch detected. Run "prisma db push" or "prisma migrate deploy"',
        );
        break;
      }

      // Base de données inaccessible
      case 'P1001':
      case 'P1002':
      case 'P1003': {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Database connection failed';
        userMessage = 'Service temporairement indisponible';
        this.logger.error('Database connection error:', exception.message);
        break;
      }

      // Timeout de requête
      case 'P2024': {
        status = HttpStatus.REQUEST_TIMEOUT;
        message = 'Database query timeout';
        userMessage = 'La requête a pris trop de temps. Veuillez réessayer.';
        break;
      }

      // Valeur trop longue pour le champ
      case 'P2000': {
        status = HttpStatus.BAD_REQUEST;
        const column = (exception.meta?.column_name as string) || 'field';
        message = `Value too long for column ${column}`;
        userMessage = `La valeur est trop longue pour le champ ${column}`;
        break;
      }

      // Valeur invalide pour le type de colonne
      case 'P2007': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Data validation error';
        userMessage = 'Données invalides';
        break;
      }

      // Échec de validation
      case 'P2011': {
        status = HttpStatus.BAD_REQUEST;
        const constraint = (exception.meta?.constraint as string) || 'constraint';
        message = `Null constraint violation on ${constraint}`;
        userMessage = `Le champ ${constraint} est obligatoire`;
        break;
      }

      default: {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Database error: ${exception.code}`;
        userMessage = 'Erreur de base de données. Veuillez contacter le support.';
      }
    }

    // Envoyer la réponse
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
      message: userMessage,
      // En développement, inclure plus de détails
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          code: exception.code,
          meta: exception.meta,
          clientVersion: exception.clientVersion,
        },
      }),
    });
  }
}

// Filtre pour les erreurs génériques de Prisma
@Catch(Prisma.PrismaClientUnknownRequestError)
export class PrismaClientUnknownExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientUnknownExceptionFilter.name);

  catch(exception: Prisma.PrismaClientUnknownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    this.logger.error('Unknown Prisma error:', exception.message, exception.stack);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: 'Database error',
      message: 'Une erreur de base de données est survenue',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          message: exception.message,
        },
      }),
    });
  }
}

// Filtre pour les erreurs de validation Prisma
@Catch(Prisma.PrismaClientValidationError)
export class PrismaClientValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(
    PrismaClientValidationExceptionFilter.name,
  );

  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    this.logger.error('Prisma validation error:', exception.message);

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: 'Validation error',
      message: 'Données de requête invalides',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          message: exception.message,
        },
      }),
    });
  }
}

// Filtre pour les erreurs d'initialisation Prisma
@Catch(Prisma.PrismaClientInitializationError)
export class PrismaClientInitializationExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(
    PrismaClientInitializationExceptionFilter.name,
  );

  catch(exception: Prisma.PrismaClientInitializationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    this.logger.error(
      'CRITICAL: Prisma initialization error:',
      exception.message,
      exception.stack,
    );

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: 'Service unavailable',
      message:
        'Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.',
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          errorCode: exception.errorCode,
          message: exception.message,
        },
      }),
    });
  }
}
