import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';

@Injectable()
export class HealthRecordsService {
  constructor(private prisma: PrismaService) {}

  async getMyRecord(patientId: string) {
    let record = await this.prisma.healthRecord.findUnique({
      where: { patientId },
    });

    // Create empty record if not exists
    if (!record) {
      record = await this.prisma.healthRecord.create({
        data: { patientId },
      });
    }

    return record;
  }

  async getPatientRecord(patientId: string, doctorId: string) {
    // Verify doctor has treated this patient (has appointments)
    const hasRelationship = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        slot: {
          ownerId: doctorId,
        },
      },
    });

    if (!hasRelationship) {
      throw new ForbiddenException('No treatment relationship with this patient');
    }

    let record = await this.prisma.healthRecord.findUnique({
      where: { patientId },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            sex: true,
            birthdate: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!record) {
      record = await this.prisma.healthRecord.create({
        data: { patientId },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              sex: true,
              birthdate: true,
              avatarUrl: true,
            },
          },
        },
      });
    }

    return record;
  }

  async updateMyRecord(patientId: string, updateDto: UpdateHealthRecordDto) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { patientId },
    });

    if (!record) {
      // Create new record with provided data
      return this.prisma.healthRecord.create({
        data: {
          patientId,
          ...updateDto,
          lastUpdatedBy: patientId,
        },
      });
    }

    return this.prisma.healthRecord.update({
      where: { patientId },
      data: {
        ...updateDto,
        lastUpdatedBy: patientId,
      },
    });
  }

  async addAllergy(patientId: string, allergy: string) {
    const record = await this.getMyRecord(patientId);

    const allergies = record.allergies || [];
    if (!allergies.includes(allergy)) {
      allergies.push(allergy);
    }

    return this.prisma.healthRecord.update({
      where: { patientId },
      data: {
        allergies,
        lastUpdatedBy: patientId,
      },
    });
  }

  async removeAllergy(patientId: string, allergy: string) {
    const record = await this.getMyRecord(patientId);

    const allergies = (record.allergies || []).filter((a) => a !== allergy);

    return this.prisma.healthRecord.update({
      where: { patientId },
      data: {
        allergies,
        lastUpdatedBy: patientId,
      },
    });
  }

  async getVitals(patientId: string) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { patientId },
      select: {
        bloodType: true,
        rhesus: true,
        heightCm: true,
        weightKg: true,
      },
    });

    // Get latest biometric measurements
    const biometrics = await this.prisma.biometricMeasurement.findMany({
      where: { patientId },
      orderBy: { measuredAt: 'desc' },
      take: 10,
    });

    return {
      ...record,
      recentMeasurements: biometrics,
    };
  }

  async getMedicalHistory(patientId: string) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { patientId },
      select: {
        medicalHistory: true,
        surgicalHistory: true,
        familyHistory: true,
      },
    });

    // Get medical history from dedicated table
    const historyRecords = await this.prisma.medicalHistory.findMany({
      where: { patientId },
      orderBy: { diagnosedAt: 'desc' },
    });

    return {
      summary: record,
      detailedHistory: historyRecords,
    };
  }

  async getVaccinations(patientId: string) {
    return this.prisma.vaccination.findMany({
      where: { patientId },
      orderBy: { administeredAt: 'desc' },
    });
  }

  async getTreatments(patientId: string) {
    return this.prisma.treatment.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getLabResults(patientId: string) {
    return this.prisma.labResult.findMany({
      where: { patientId },
      orderBy: { resultDate: 'desc' },
      take: 50,
    });
  }

  async getObservations(patientId: string) {
    return this.prisma.clinicalObservation.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { observedAt: 'desc' },
      take: 20,
    });
  }

  async getFullRecord(patientId: string) {
    const [
      record,
      vitals,
      vaccinations,
      treatments,
      labResults,
      observations,
      prescriptions,
    ] = await Promise.all([
      this.getMyRecord(patientId),
      this.getVitals(patientId),
      this.getVaccinations(patientId),
      this.getTreatments(patientId),
      this.getLabResults(patientId),
      this.getObservations(patientId),
      this.prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      ...record,
      vitals,
      vaccinations,
      treatments,
      labResults,
      observations,
      prescriptions,
    };
  }

  async exportRecord(patientId: string) {
    const fullRecord = await this.getFullRecord(patientId);

    // Get patient info
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: {
        fullName: true,
        email: true,
        phone: true,
        sex: true,
        birthdate: true,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      patient,
      healthRecord: fullRecord,
    };
  }
}
