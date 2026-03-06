import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(fromDoctorId: string, dto: {
    patientId: string;
    toDoctorId: string;
    reason: string;
    notes?: string;
    urgency?: string;
  }) {
    // Verify patient exists
    const patient = await this.prisma.user.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new NotFoundException('Patient introuvable');

    // Verify target doctor exists
    const toDoctor = await this.prisma.user.findUnique({ where: { id: dto.toDoctorId } });
    if (!toDoctor || toDoctor.role !== 'DOCTOR') throw new NotFoundException('Médecin destinataire introuvable');

    // Prevent duplicate active referrals for the same patient to the same doctor
    const existing = await this.prisma.referral.findFirst({
      where: {
        patientId: dto.patientId,
        toDoctorId: dto.toDoctorId,
        status: { in: ['PENDING', 'ACCEPTED'] as any },
      },
    });
    if (existing) throw new ConflictException('Un transfert actif existe déjà pour ce patient vers ce médecin');

    const fromDoctor = await this.prisma.user.findUnique({ where: { id: fromDoctorId } });

    const referral = await this.prisma.referral.create({
      data: {
        patientId: dto.patientId,
        fromDoctorId,
        toDoctorId: dto.toDoctorId,
        reason: dto.reason,
        notes: dto.notes,
        urgency: (dto.urgency as any) ?? 'NORMAL',
      },
      include: {
        patient: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        fromDoctor: { select: { id: true, fullName: true, email: true, doctorProfile: { select: { specialty: true } } } },
        toDoctor: { select: { id: true, fullName: true, email: true, doctorProfile: { select: { specialty: true } } } },
      },
    });

    // Notify the receiving doctor
    try {
      await this.notifications.create({
        userId: dto.toDoctorId,
        type: 'NEW_REFERRAL',
        title: 'Nouveau dossier reçu',
        message: `Dr ${fromDoctor?.fullName || 'Un confrère'} vous adresse le patient ${patient.fullName || 'un patient'}`,
      });
    } catch { /* non-blocking */ }

    return referral;
  }

  async getSent(doctorId: string) {
    return this.prisma.referral.findMany({
      where: { fromDoctorId: doctorId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, email: true, avatarUrl: true, birthdate: true } },
        toDoctor: { select: { id: true, fullName: true, email: true, avatarUrl: true, doctorProfile: { select: { specialty: true, city: true } } } },
      },
    });
  }

  async getReceived(doctorId: string) {
    return this.prisma.referral.findMany({
      where: { toDoctorId: doctorId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, email: true, avatarUrl: true, birthdate: true } },
        fromDoctor: { select: { id: true, fullName: true, email: true, avatarUrl: true, doctorProfile: { select: { specialty: true, city: true } } } },
      },
    });
  }

  async respond(referralId: string, doctorId: string, dto: { status: string; response?: string }) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        patient: { select: { id: true, fullName: true } },
        toDoctor: { select: { id: true, fullName: true } },
      },
    });
    if (!referral) throw new NotFoundException('Adressage introuvable');
    if (referral.toDoctorId !== doctorId) throw new ForbiddenException('Non autorisé');

    const updated = await this.prisma.referral.update({
      where: { id: referralId },
      data: {
        status: dto.status as any,
        response: dto.response,
        respondedAt: new Date(),
      },
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        fromDoctor: { select: { id: true, fullName: true, email: true } },
        toDoctor: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Notify the sender about the response
    try {
      const accepted = dto.status === 'ACCEPTED';
      await this.notifications.create({
        userId: referral.fromDoctorId,
        type: 'REFERRAL_RESPONSE',
        title: accepted ? 'Dossier accepté' : 'Dossier refusé',
        message: `Dr ${referral.toDoctor?.fullName || 'Le médecin'} a ${accepted ? 'accepté' : 'refusé'} le dossier de ${referral.patient?.fullName || 'votre patient'}`,
      });
    } catch { /* non-blocking */ }

    return updated;
  }

  async getReceivedPatients(doctorId: string) {
    return this.prisma.referral.findMany({
      where: { toDoctorId: doctorId, status: 'ACCEPTED' as any },
      include: {
        patient: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, birthdate: true } },
        fromDoctor: { select: { id: true, fullName: true } },
      },
      orderBy: { respondedAt: 'desc' },
    });
  }

  async complete(referralId: string, doctorId: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral) throw new NotFoundException('Adressage introuvable');
    if (referral.fromDoctorId !== doctorId && referral.toDoctorId !== doctorId) {
      throw new ForbiddenException('Non autorisé');
    }
    return this.prisma.referral.update({
      where: { id: referralId },
      data: { status: 'COMPLETED' },
    });
  }
}
