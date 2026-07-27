import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';

@Injectable()
export class WaitlistService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async join(patientId: string, dto: { doctorId: string; date: string; kindId?: string }) {
    const doctor = await this.prisma.user.findUnique({ where: { id: dto.doctorId } });
    if (!doctor || doctor.role !== 'DOCTOR') throw new NotFoundException('Médecin introuvable');

    const date = new Date(dto.date);
    date.setUTCHours(0, 0, 0, 0);

    const existing = await (this.prisma as any).waitlistEntry.findFirst({
      where: { doctorId: dto.doctorId, patientId, date, status: 'ACTIVE' },
    });
    if (existing) throw new BadRequestException('Vous êtes déjà sur la liste d\'attente pour ce médecin ce jour');

    const lastInQueue = await (this.prisma as any).waitlistEntry.findFirst({
      where: { doctorId: dto.doctorId, date, status: 'ACTIVE' },
      orderBy: { position: 'desc' },
    });

    return (this.prisma as any).waitlistEntry.create({
      data: {
        doctorId: dto.doctorId,
        patientId,
        kindId: dto.kindId,
        date,
        position: (lastInQueue?.position ?? 0) + 1,
        status: 'ACTIVE',
      },
      include: {
        doctor: { select: { id: true, fullName: true, email: true } },
        patient: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async leave(entryId: string, patientId: string) {
    const entry = await (this.prisma as any).waitlistEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entrée introuvable');
    if (entry.patientId !== patientId) throw new ForbiddenException('Accès refusé');

    await (this.prisma as any).waitlistEntry.delete({ where: { id: entryId } });
    return { success: true };
  }

  async myEntries(patientId: string) {
    return (this.prisma as any).waitlistEntry.findMany({
      where: { patientId, status: { in: ['ACTIVE', 'NOTIFIED'] } },
      include: {
        doctor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async doctorWaitlist(doctorId: string, date?: string) {
    const where: any = { doctorId, status: { in: ['ACTIVE', 'NOTIFIED'] } };
    if (date) {
      const d = new Date(date);
      d.setUTCHours(0, 0, 0, 0);
      where.date = d;
    }
    return (this.prisma as any).waitlistEntry.findMany({
      where,
      include: { patient: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: [{ date: 'asc' }, { position: 'asc' }],
    });
  }

  /** Called when an appointment is cancelled — notify the first waiting patient */
  async notifyNextOnWaitlist(doctorId: string, date: Date) {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const first = await (this.prisma as any).waitlistEntry.findFirst({
      where: {
        doctorId,
        date: { gte: dayStart, lt: dayEnd },
        status: 'ACTIVE',
      },
      orderBy: { position: 'asc' },
      include: {
        patient: { select: { fullName: true, email: true } },
        doctor:  { select: { fullName: true, email: true } },
      },
    });

    if (!first) return;

    await (this.prisma as any).waitlistEntry.update({
      where: { id: first.id },
      data: { status: 'NOTIFIED', notifiedAt: new Date() },
    });

    // Send notification email
    const doctorName = first.doctor.fullName ?? first.doctor.email;
    const slotDate = dayStart.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    await this.emailService.sendRaw(
      first.patient.email,
      `Un créneau vient de se libérer — Dr ${doctorName}`,
      `
        <p>Bonjour ${first.patient.fullName ?? ''},</p>
        <p>Un créneau vient de se libérer chez <strong>Dr ${doctorName}</strong> le <strong>${slotDate}</strong>.</p>
        <p>Connectez-vous rapidement pour réserver votre place avant qu'elle ne soit prise !</p>
        <p>À bientôt,<br/>L'équipe Ibogha 241</p>
      `
    );
  }
}
