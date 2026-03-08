import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer une nouvelle consultation
   */
  async create(
    doctorId: string,
    dto: {
      patientId: string;
      appointmentId?: string;
      motif?: string;
      mode?: string;
    },
  ) {
    // Vérifier que le patient existe
    const patient = await this.prisma.user.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient non trouvé');
    }

    // Note: `mode` field requires running the SQL migration below in Supabase first:
    // ALTER TABLE "Consultation" ADD COLUMN IF NOT EXISTS "mode" TEXT DEFAULT 'PRESENTIEL';
    // Then uncomment: mode: dto.mode || 'PRESENTIEL',
    return this.prisma.consultation.create({
      data: {
        patientId: dto.patientId,
        doctorId,
        appointmentId: dto.appointmentId,
        motif: dto.motif,
        status: 'ACTIVE',
        startedAt: new Date(),
      } as any,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            birthdate: true,
            sex: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Récupérer les consultations d'un patient par un médecin
   */
  async listForPatient(
    patientId: string,
    doctorId: string,
    status?: string,
  ) {
    const where: any = { patientId, doctorId };

    if (status) {
      where.status = status;
    }

    return this.prisma.consultation.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            type: true,
            slot: {
              select: {
                start: true,
                end: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Récupérer une consultation par ID
   */
  async findById(consultationId: string, userId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            birthdate: true,
            sex: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation non trouvée');
    }

    if (consultation.doctorId !== userId && consultation.patientId !== userId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return consultation;
  }

  /**
   * Mettre à jour une consultation (sauvegarder le brouillon)
   */
  async update(
    consultationId: string,
    doctorId: string,
    dto: {
      motif?: string;
      interrogatoire?: string;
      examen?: string;
      notes?: string;
    },
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation non trouvée');
    }

    if (consultation.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        motif: dto.motif,
        interrogatoire: dto.interrogatoire,
        examen: dto.examen,
        notes: dto.notes,
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Terminer une consultation
   */
  async end(
    consultationId: string,
    doctorId: string,
    dto: {
      motif?: string;
      interrogatoire?: string;
      examen?: string;
      notes?: string;
    },
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation non trouvée');
    }

    if (consultation.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (consultation.status !== 'ACTIVE') {
      throw new BadRequestException('Cette consultation est déjà terminée');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        motif: dto.motif ?? consultation.motif,
        interrogatoire: dto.interrogatoire ?? consultation.interrogatoire,
        examen: dto.examen ?? consultation.examen,
        notes: dto.notes ?? consultation.notes,
        status: 'COMPLETED',
        endedAt: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Récupérer la consultation active d'un patient
   */
  async getActive(patientId: string, doctorId: string) {
    return this.prisma.consultation.findFirst({
      where: {
        patientId,
        doctorId,
        status: 'ACTIVE',
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  /**
   * Supprimer une consultation
   */
  async remove(consultationId: string, doctorId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation non trouvée');
    }

    if (consultation.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    await this.prisma.consultation.delete({
      where: { id: consultationId },
    });

    return { deleted: true };
  }
}
