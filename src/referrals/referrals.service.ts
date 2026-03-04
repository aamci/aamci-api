import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.referral.create({
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
    const referral = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral) throw new NotFoundException('Adressage introuvable');
    if (referral.toDoctorId !== doctorId) throw new ForbiddenException('Non autorisé');

    return this.prisma.referral.update({
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
