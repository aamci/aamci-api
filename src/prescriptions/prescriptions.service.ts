import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  // Générer un numéro d'ordonnance unique
  private async generatePrescriptionNumber(doctorId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.prescription.count({
      where: {
        doctorId,
        prescriptionNumber: {
          startsWith: `ORD-${year}`,
        },
      },
    });
    const num = (count + 1).toString().padStart(4, '0');
    return `ORD-${year}-${num}`;
  }

  // Liste des prescriptions pour un médecin
  async listForDoctor(
    doctorId: string,
    filters?: {
      status?: string;
      patientId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: any = { doctorId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.issueDate = {};
      if (filters.startDate) {
        where.issueDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.issueDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.prescription.findMany({
      where,
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
        medications: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Liste des prescriptions pour un patient (accès par médecin)
  async listForPatient(
    patientId: string,
    doctorId: string,
    status?: string,
  ) {
    const where: any = { patientId, doctorId };

    if (status) {
      where.status = status;
    }

    return this.prisma.prescription.findMany({
      where,
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
        medications: true,
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  // Récupérer une prescription par ID
  async findById(prescriptionId: string, userId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            birthdate: true,
            sex: true,
            city: true,
            patientProfile: {
              select: {
                addressLine1: true,
                city: true,
                postalCode: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            doctorProfile: {
              select: {
                specialty: true,
                address: true,
                city: true,
              },
            },
          },
        },
        medications: true,
      },
    });

    if (!prescription) {
      throw new NotFoundException('Ordonnance non trouvée');
    }

    // Vérifier les droits d'accès
    if (
      prescription.doctorId !== userId &&
      prescription.patientId !== userId
    ) {
      throw new ForbiddenException('Accès non autorisé à cette ordonnance');
    }

    return prescription;
  }

  // Créer une nouvelle prescription
  async create(
    doctorId: string,
    dto: {
      patientId: string;
      appointmentId?: string;
      diagnosis?: string;
      generalInstructions?: string;
      validUntil?: string;
      medications: Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
        quantity?: number;
      }>;
    },
  ) {
    // Vérifier que le patient existe
    const patient = await this.prisma.user.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient non trouvé');
    }

    if (dto.medications.length === 0) {
      throw new BadRequestException(
        'Au moins un médicament doit être ajouté',
      );
    }

    // Générer le numéro d'ordonnance
    const prescriptionNumber =
      await this.generatePrescriptionNumber(doctorId);

    // Calculer la date de validité par défaut (30 jours)
    const defaultValidUntil = new Date();
    defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);

    // Créer la prescription avec ses médicaments
    const prescription = await this.prisma.prescription.create({
      data: {
        prescriptionNumber,
        doctorId,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        diagnosis: dto.diagnosis,
        generalInstructions: dto.generalInstructions,
        validUntil: dto.validUntil
          ? new Date(dto.validUntil)
          : defaultValidUntil,
        status: 'DRAFT',
        medications: {
          create: dto.medications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            quantity: med.quantity,
          })),
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        medications: true,
      },
    });

    return prescription;
  }

  // Mettre à jour une prescription (brouillon uniquement)
  async update(
    prescriptionId: string,
    doctorId: string,
    dto: {
      diagnosis?: string;
      generalInstructions?: string;
      validUntil?: string;
      medications?: Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
        quantity?: number;
      }>;
    },
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Ordonnance non trouvée');
    }

    if (prescription.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (prescription.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seules les ordonnances en brouillon peuvent être modifiées',
      );
    }

    const updateData: any = {};

    if (dto.diagnosis !== undefined) {
      updateData.diagnosis = dto.diagnosis;
    }

    if (dto.generalInstructions !== undefined) {
      updateData.generalInstructions = dto.generalInstructions;
    }

    if (dto.validUntil !== undefined) {
      updateData.validUntil = new Date(dto.validUntil);
    }

    // Si les médicaments changent, supprimer les anciens et créer les nouveaux
    if (dto.medications) {
      await this.prisma.prescriptionMedication.deleteMany({
        where: { prescriptionId },
      });

      updateData.medications = {
        create: dto.medications.map((med) => ({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          quantity: med.quantity,
        })),
      };
    }

    return this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: updateData,
      include: {
        patient: true,
        medications: true,
      },
    });
  }

  // Activer une prescription (la signer et la rendre valide)
  async activate(prescriptionId: string, doctorId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Ordonnance non trouvée');
    }

    if (prescription.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (prescription.status !== 'DRAFT') {
      throw new BadRequestException('Cette ordonnance est déjà active');
    }

    return this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        status: 'ACTIVE',
        issueDate: new Date(),
      },
      include: {
        patient: true,
        medications: true,
      },
    });
  }

  // Annuler une prescription
  async cancel(prescriptionId: string, doctorId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Ordonnance non trouvée');
    }

    if (prescription.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (prescription.status === 'CANCELLED') {
      throw new BadRequestException('Cette ordonnance est déjà annulée');
    }

    return this.prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: 'CANCELLED' },
    });
  }

  // Renouveler une prescription (créer une copie)
  async renew(
    prescriptionId: string,
    doctorId: string,
    validUntil?: string,
  ) {
    const original = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        medications: true,
      },
    });

    if (!original) {
      throw new NotFoundException('Ordonnance non trouvée');
    }

    if (original.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Générer un nouveau numéro
    const prescriptionNumber =
      await this.generatePrescriptionNumber(doctorId);

    // Calculer la nouvelle date de validité
    const defaultValidUntil = new Date();
    defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);

    // Créer une nouvelle prescription basée sur l'originale
    const renewed = await this.prisma.prescription.create({
      data: {
        prescriptionNumber,
        doctorId,
        patientId: original.patientId,
        diagnosis: original.diagnosis,
        generalInstructions: original.generalInstructions,
        validUntil: validUntil
          ? new Date(validUntil)
          : defaultValidUntil,
        status: 'DRAFT',
        renewalCount: original.renewalCount + 1,
        renewedFromId: original.id,
        medications: {
          create: original.medications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            quantity: med.quantity,
          })),
        },
      },
      include: {
        patient: true,
        medications: true,
      },
    });

    return renewed;
  }

  // Supprimer une prescription (brouillon uniquement)
  async delete(prescriptionId: string, doctorId: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Ordonnance non trouvée');
    }

    if (prescription.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (prescription.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seules les ordonnances en brouillon peuvent être supprimées',
      );
    }

    await this.prisma.prescription.delete({
      where: { id: prescriptionId },
    });

    return { message: 'Ordonnance supprimée avec succès' };
  }
}
