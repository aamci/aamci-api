import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

const INCLUDE = {
  sender: { select: { id: true, fullName: true, avatarUrl: true, doctorProfile: { select: { specialty: true } } } },
  recipient: { select: { id: true, fullName: true, avatarUrl: true, doctorProfile: { select: { specialty: true } } } },
  patient: { select: { id: true, fullName: true, email: true, avatarUrl: true, birthdate: true } },
};

@Injectable()
export class CorrespondencesService {
  constructor(private prisma: PrismaService) {}

  async create(senderId: string, dto: {
    recipientId: string;
    patientId?: string;
    category?: string;
    subject: string;
    content: string;
  }) {
    const recipient = await this.prisma.user.findUnique({ where: { id: dto.recipientId } });
    if (!recipient || recipient.role !== 'DOCTOR') {
      throw new NotFoundException('Médecin destinataire introuvable');
    }
    return this.prisma.medicalCorrespondence.create({
      data: {
        senderId,
        recipientId: dto.recipientId,
        patientId: dto.patientId ?? null,
        category: (dto.category as any) ?? 'AUTRE',
        subject: dto.subject,
        content: dto.content,
      },
      include: INCLUDE,
    });
  }

  async getSent(doctorId: string) {
    return this.prisma.medicalCorrespondence.findMany({
      where: { senderId: doctorId },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  async getReceived(doctorId: string) {
    return this.prisma.medicalCorrespondence.findMany({
      where: { recipientId: doctorId },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  async getForPatient(doctorId: string, patientId: string) {
    return this.prisma.medicalCorrespondence.findMany({
      where: {
        patientId,
        OR: [{ senderId: doctorId }, { recipientId: doctorId }],
      },
      orderBy: { createdAt: 'desc' },
      include: INCLUDE,
    });
  }

  async markRead(id: string, doctorId: string) {
    const c = await this.prisma.medicalCorrespondence.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    if (c.recipientId !== doctorId) throw new ForbiddenException();
    return this.prisma.medicalCorrespondence.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
      include: INCLUDE,
    });
  }

  async getUnreadCount(doctorId: string) {
    const count = await this.prisma.medicalCorrespondence.count({
      where: { recipientId: doctorId, isRead: false },
    });
    return { count };
  }
}
