import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PatientRecordService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PROFIL PATIENT
  // ==========================================

  async getPatientProfile(patientId: string, doctorId: string) {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      include: {
        patientProfile: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient non trouvé');
    }

    return patient;
  }

  async updatePatientProfile(patientId: string, doctorId: string, data: any) {
    // Vérifier que le patient existe
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      include: { patientProfile: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient non trouvé');
    }

    // Upsert le profil patient
    return this.prisma.patientProfile.upsert({
      where: { userId: patientId },
      update: data,
      create: {
        userId: patientId,
        ...data,
      },
    });
  }

  // ==========================================
  // ANTÉCÉDENTS MÉDICAUX
  // ==========================================

  async getMedicalHistory(patientId: string, category?: string) {
    const where: any = { patientId };
    if (category) {
      where.category = category;
    }

    return this.prisma.medicalHistory.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { diagnosedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async getMedicalHistoryStats(patientId: string) {
    const [allergies, medical, surgical, family, cardiovascular, lifestyle] = await Promise.all([
      this.prisma.medicalHistory.count({ where: { patientId, category: 'ALLERGY' } }),
      this.prisma.medicalHistory.count({ where: { patientId, category: 'MEDICAL' } }),
      this.prisma.medicalHistory.count({ where: { patientId, category: 'SURGICAL' } }),
      this.prisma.medicalHistory.count({ where: { patientId, category: 'FAMILY' } }),
      this.prisma.medicalHistory.count({ where: { patientId, category: 'CARDIOVASCULAR' } }),
      this.prisma.medicalHistory.count({ where: { patientId, category: 'LIFESTYLE' } }),
    ]);

    return { allergies, medical, surgical, family, cardiovascular, lifestyle };
  }

  async createMedicalHistory(patientId: string, doctorId: string, data: any) {
    return this.prisma.medicalHistory.create({
      data: {
        patientId,
        doctorId,
        ...data,
        diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : null,
        resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : null,
      },
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async updateMedicalHistory(id: string, doctorId: string, data: any) {
    const history = await this.prisma.medicalHistory.findUnique({ where: { id } });
    if (!history) {
      throw new NotFoundException('Antécédent non trouvé');
    }

    return this.prisma.medicalHistory.update({
      where: { id },
      data: {
        ...data,
        diagnosedAt: data.diagnosedAt ? new Date(data.diagnosedAt) : undefined,
        resolvedAt: data.resolvedAt ? new Date(data.resolvedAt) : undefined,
      },
    });
  }

  async deleteMedicalHistory(id: string, doctorId: string) {
    const history = await this.prisma.medicalHistory.findUnique({ where: { id } });
    if (!history) {
      throw new NotFoundException('Antécédent non trouvé');
    }

    return this.prisma.medicalHistory.delete({ where: { id } });
  }

  // ==========================================
  // VACCINATIONS
  // ==========================================

  async getVaccinations(patientId: string) {
    return this.prisma.vaccination.findMany({
      where: { patientId },
      orderBy: { administeredAt: 'desc' },
    });
  }

  async getVaccinationsStats(patientId: string) {
    const total = await this.prisma.vaccination.count({ where: { patientId } });
    const upcoming = await this.prisma.vaccination.count({
      where: {
        patientId,
        nextDoseAt: { gte: new Date() },
      },
    });

    return { total, upcoming };
  }

  async createVaccination(patientId: string, data: any) {
    return this.prisma.vaccination.create({
      data: {
        patientId,
        ...data,
        administeredAt: new Date(data.administeredAt),
        nextDoseAt: data.nextDoseAt ? new Date(data.nextDoseAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async updateVaccination(id: string, data: any) {
    const vaccination = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!vaccination) {
      throw new NotFoundException('Vaccination non trouvée');
    }

    return this.prisma.vaccination.update({
      where: { id },
      data: {
        ...data,
        administeredAt: data.administeredAt ? new Date(data.administeredAt) : undefined,
        nextDoseAt: data.nextDoseAt ? new Date(data.nextDoseAt) : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async deleteVaccination(id: string) {
    const vaccination = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!vaccination) {
      throw new NotFoundException('Vaccination non trouvée');
    }

    return this.prisma.vaccination.delete({ where: { id } });
  }

  // ==========================================
  // TRAITEMENTS
  // ==========================================

  async getTreatments(patientId: string, status?: string) {
    const where: any = { patientId };
    if (status) {
      where.status = status;
    }

    return this.prisma.treatment.findMany({
      where,
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async getTreatmentsStats(patientId: string) {
    const [active, paused, stopped, completed] = await Promise.all([
      this.prisma.treatment.count({ where: { patientId, status: 'ACTIVE' } }),
      this.prisma.treatment.count({ where: { patientId, status: 'PAUSED' } }),
      this.prisma.treatment.count({ where: { patientId, status: 'STOPPED' } }),
      this.prisma.treatment.count({ where: { patientId, status: 'COMPLETED' } }),
    ]);

    return { active, paused, stopped, completed, total: active + paused + stopped + completed };
  }

  async createTreatment(patientId: string, doctorId: string, data: any) {
    return this.prisma.treatment.create({
      data: {
        patientId,
        doctorId,
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async updateTreatment(id: string, data: any) {
    const treatment = await this.prisma.treatment.findUnique({ where: { id } });
    if (!treatment) {
      throw new NotFoundException('Traitement non trouvé');
    }

    return this.prisma.treatment.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async deleteTreatment(id: string) {
    const treatment = await this.prisma.treatment.findUnique({ where: { id } });
    if (!treatment) {
      throw new NotFoundException('Traitement non trouvé');
    }

    return this.prisma.treatment.delete({ where: { id } });
  }

  // ==========================================
  // MESURES BIOMÉTRIQUES
  // ==========================================

  async getBiometrics(patientId: string, type?: string) {
    const where: any = { patientId };
    if (type) {
      where.type = type;
    }

    return this.prisma.biometricMeasurement.findMany({
      where,
      orderBy: { measuredAt: 'desc' },
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async getLatestBiometrics(patientId: string) {
    // Récupérer la dernière mesure de chaque type
    const types = ['WEIGHT', 'HEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'TEMPERATURE', 'OXYGEN_SATURATION'];

    const latestMeasurements: any = {};

    for (const type of types) {
      const measurement = await this.prisma.biometricMeasurement.findFirst({
        where: { patientId, type: type as any },
        orderBy: { measuredAt: 'desc' },
      });
      if (measurement) {
        latestMeasurements[type.toLowerCase()] = measurement;
      }
    }

    return latestMeasurements;
  }

  async getBiometricsHistory(patientId: string, type: string, limit: number = 10) {
    return this.prisma.biometricMeasurement.findMany({
      where: { patientId, type: type as any },
      orderBy: { measuredAt: 'desc' },
      take: limit,
    });
  }

  async createBiometric(patientId: string, doctorId: string | null, data: any) {
    return this.prisma.biometricMeasurement.create({
      data: {
        patientId,
        doctorId,
        ...data,
        measuredAt: data.measuredAt ? new Date(data.measuredAt) : new Date(),
      },
    });
  }

  async deleteBiometric(id: string) {
    const biometric = await this.prisma.biometricMeasurement.findUnique({ where: { id } });
    if (!biometric) {
      throw new NotFoundException('Mesure non trouvée');
    }

    return this.prisma.biometricMeasurement.delete({ where: { id } });
  }

  // ==========================================
  // OBSERVATIONS CLINIQUES
  // ==========================================

  async getObservations(patientId: string, category?: string) {
    const where: any = { patientId };
    if (category) {
      where.category = category;
    }

    return this.prisma.clinicalObservation.findMany({
      where,
      orderBy: { observedAt: 'desc' },
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async createObservation(patientId: string, doctorId: string, data: any) {
    return this.prisma.clinicalObservation.create({
      data: {
        patientId,
        doctorId,
        ...data,
        observedAt: data.observedAt ? new Date(data.observedAt) : new Date(),
      },
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async updateObservation(id: string, data: any) {
    const observation = await this.prisma.clinicalObservation.findUnique({ where: { id } });
    if (!observation) {
      throw new NotFoundException('Observation non trouvée');
    }

    return this.prisma.clinicalObservation.update({
      where: { id },
      data: {
        ...data,
        observedAt: data.observedAt ? new Date(data.observedAt) : undefined,
      },
    });
  }

  async deleteObservation(id: string) {
    const observation = await this.prisma.clinicalObservation.findUnique({ where: { id } });
    if (!observation) {
      throw new NotFoundException('Observation non trouvée');
    }

    return this.prisma.clinicalObservation.delete({ where: { id } });
  }

  // ==========================================
  // RÉSULTATS DE LABORATOIRE
  // ==========================================

  async getLabResults(patientId: string, category?: string) {
    const where: any = { patientId };
    if (category) {
      where.category = category;
    }

    return this.prisma.labResult.findMany({
      where,
      orderBy: { resultDate: 'desc' },
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async createLabResult(patientId: string, doctorId: string | null, data: any) {
    return this.prisma.labResult.create({
      data: {
        patientId,
        doctorId,
        ...data,
        sampleDate: data.sampleDate ? new Date(data.sampleDate) : null,
        resultDate: new Date(data.resultDate),
      },
      include: {
        doctor: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async deleteLabResult(id: string) {
    const result = await this.prisma.labResult.findUnique({ where: { id } });
    if (!result) {
      throw new NotFoundException('Résultat non trouvé');
    }

    return this.prisma.labResult.delete({ where: { id } });
  }

  // ==========================================
  // CONTACTS D'URGENCE
  // ==========================================

  async getEmergencyContacts(patientId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { patientId },
      orderBy: [{ isPrimary: 'desc' }, { priority: 'asc' }],
    });
  }

  async createEmergencyContact(patientId: string, data: any) {
    // Si ce contact est primaire, retirer le statut primaire des autres
    if (data.isPrimary) {
      await this.prisma.emergencyContact.updateMany({
        where: { patientId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.emergencyContact.create({
      data: {
        patientId,
        ...data,
      },
    });
  }

  async updateEmergencyContact(id: string, data: any) {
    const contact = await this.prisma.emergencyContact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact non trouvé');
    }

    // Si ce contact devient primaire, retirer le statut primaire des autres
    if (data.isPrimary) {
      await this.prisma.emergencyContact.updateMany({
        where: { patientId: contact.patientId, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return this.prisma.emergencyContact.update({
      where: { id },
      data,
    });
  }

  async deleteEmergencyContact(id: string) {
    const contact = await this.prisma.emergencyContact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException('Contact non trouvé');
    }

    return this.prisma.emergencyContact.delete({ where: { id } });
  }

  // ==========================================
  // CONSENTEMENTS
  // ==========================================

  async getConsents(patientId: string) {
    return this.prisma.patientConsent.findMany({
      where: { patientId },
      orderBy: { type: 'asc' },
    });
  }

  async updateConsent(patientId: string, type: string, granted: boolean, ipAddress?: string) {
    const now = new Date();

    return this.prisma.patientConsent.upsert({
      where: {
        patientId_type: {
          patientId,
          type: type as any,
        },
      },
      update: {
        granted,
        grantedAt: granted ? now : null,
        revokedAt: granted ? null : now,
        signedAt: now,
        ipAddress,
      },
      create: {
        patientId,
        type: type as any,
        granted,
        grantedAt: granted ? now : null,
        signedAt: now,
        ipAddress,
      },
    });
  }

  // ==========================================
  // DOSSIER COMPLET
  // ==========================================

  async getFullRecord(patientId: string) {
    const [
      patient,
      medicalHistory,
      medicalHistoryStats,
      vaccinations,
      treatments,
      treatmentsStats,
      latestBiometrics,
      observations,
      labResults,
      emergencyContacts,
      consents,
      documents,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: patientId },
        include: { patientProfile: true },
      }),
      this.getMedicalHistory(patientId),
      this.getMedicalHistoryStats(patientId),
      this.getVaccinations(patientId),
      this.getTreatments(patientId),
      this.getTreatmentsStats(patientId),
      this.getLatestBiometrics(patientId),
      this.getObservations(patientId),
      this.getLabResults(patientId),
      this.getEmergencyContacts(patientId),
      this.getConsents(patientId),
      this.prisma.medicalDocument.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    if (!patient) {
      throw new NotFoundException('Patient non trouvé');
    }

    return {
      patient,
      medicalHistory,
      medicalHistoryStats,
      vaccinations,
      treatments,
      treatmentsStats,
      latestBiometrics,
      observations,
      labResults,
      emergencyContacts,
      consents,
      documents,
    };
  }

  // ==========================================
  // HISTORIQUE DES CONSULTATIONS
  // ==========================================

  async getAppointmentHistory(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        slot: {
          select: {
            start: true,
            end: true,
            ownerId: true,
          },
        },
        kind: {
          select: {
            name: true,
            isTelemedicine: true,
          },
        },
      },
    });
  }

  // ──────────────────────────────────────────
  // PARTAGE DU DOSSIER
  // ──────────────────────────────────────────

  async shareDossier(patientId: string, doctorId: string, customNote?: string) {
    const [patient, doctor, profile, prescriptions, healthRecord] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: patientId }, select: { fullName: true, birthdate: true, sex: true } }),
      this.prisma.user.findUnique({ where: { id: doctorId }, select: { id: true, fullName: true, role: true } }),
      this.prisma.patientProfile.findUnique({ where: { userId: patientId } }),
      this.prisma.prescription.findMany({
        where: { patientId, status: 'ACTIVE' },
        include: { medications: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.healthRecord.findUnique({ where: { patientId } }).catch(() => null),
    ]);

    if (!doctor) throw new NotFoundException('Médecin introuvable');

    const lines: string[] = [
      `📁 Partage de dossier médical`,
      ``,
      `Bonjour Dr ${doctor.fullName ?? ''},`,
      ``,
      `Je vous partage un résumé de mon dossier médical.`,
      ``,
      `── Patient ──`,
      `Nom : ${patient?.fullName ?? 'N/A'}`,
      `Sexe : ${patient?.sex === 'F' ? 'Féminin' : patient?.sex === 'M' ? 'Masculin' : 'N/A'}`,
      `Date de naissance : ${patient?.birthdate ? new Date(patient.birthdate).toLocaleDateString('fr-FR') : 'N/A'}`,
    ];

    if ((profile as any)?.bloodGroup) lines.push(`Groupe sanguin : ${(profile as any).bloodGroup}`);
    if ((profile as any)?.allergies) lines.push(`Allergies connues : ${(profile as any).allergies}`);
    if ((profile as any)?.chronicConditions) lines.push(`Pathologies chroniques : ${(profile as any).chronicConditions}`);

    if (prescriptions.length > 0) {
      lines.push(``, `── Traitements en cours ──`);
      prescriptions.forEach((p: any) => {
        p.medications.forEach((m: any) => {
          lines.push(`• ${m.name}${m.dosage ? ` — ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}`);
        });
      });
    }

    if (customNote) {
      lines.push(``, `── Note ──`, customNote);
    }

    lines.push(``, `Cordialement,`, patient?.fullName ?? '');

    const content = lines.join('\n');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: patientId, participant2Id: doctorId },
          { participant1Id: doctorId, participant2Id: patientId },
        ],
      },
    });

    const conversationId = existing
      ? existing.id
      : (await this.prisma.conversation.create({
          data: { participant1Id: patientId, participant2Id: doctorId },
        })).id;

    await this.prisma.message.create({
      data: { conversationId, senderId: patientId, content },
    });

    return { ok: true, conversationId };
  }
}
