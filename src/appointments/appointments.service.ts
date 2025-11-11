// src/appointments/appointments.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.appointment.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
    });
  }


  // patient ou doctor selon le rôle
  async findForUser(userId: string, role: string) {
    if (role === 'DOCTOR' || role === 'HOSPITAL') {
      // tous les rendez-vous sur SES créneaux
      return this.prisma.appointment.findMany({
        where: {
          slot: {
            ownerId: userId,
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          patient: true,
          slot: true,
        },
      });
    }

    // sinon c'est un patient
    return this.prisma.appointment.findMany({
      where: { patientId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        slot: true,
      },
    });
  }

  // créer côté patient
  async create(data: { slotId: string; patientId: string; notes?: string; type?: string }) {
    return this.prisma.appointment.create({
      data: {
        slotId: data.slotId,
        patientId: data.patientId,
        notes: data.notes,
        type: (data.type as any) ?? 'CONSULTATION',
      },
    });
  }

  // ✅ DOCTOR / HOSPITAL change le statut d'un RDV qui est sur son slot
  async updateStatusAsOwner(appointmentId: string, requesterId: string, status: AppointmentStatus) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        slot: true,
      },
    });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable');

    // contrôle de propriété : le créneau doit appartenir au médecin connecté
    if (appt.slot.ownerId !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez modifier que les rendez-vous de vos créneaux.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });
  }

  // ✅ DOCTOR / HOSPITAL déplace un RDV (change l’heure de début du slot ou crée un nouveau slot selon ton modèle)
  async rescheduleAsOwner(appointmentId: string, requesterId: string, newStartIso: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        slot: true,
      },
    });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable');

    if (appt.slot.ownerId !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez déplacer que les rendez-vous de vos créneaux.');
    }

    const newStart = new Date(newStartIso);
    if (Number.isNaN(newStart.getTime())) {
      throw new NotFoundException('Date de déplacement invalide');
    }

    // ici je fais le plus simple : je déplace le slot lui-même
    // si tu veux réassigner à un autre slot, on fera une autre méthode
    const slot = appt.slot;
    const duration = new Date(slot.end).getTime() - new Date(slot.start).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    await this.prisma.availabilitySlot.update({
      where: { id: slot.id },
      data: {
        start: newStart,
        end: newEnd,
      },
    });

    // on peut retourner le rendez-vous avec slot mis à jour
    return this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        slot: true,
      },
    });
  }

  async createForPatient(patientId: string, slotId: string, notes?: string) {
  // 1. vérifier que le slot est encore libre
  const slot = await this.prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    include: { appointments: true },
  });
  if (!slot) throw new NotFoundException('Créneau introuvable');

  // si tu veux 1 seul patient par slot
  if (slot.appointments.length > 0) {
    throw new ForbiddenException('Ce créneau est déjà réservé.');
  }

  return this.prisma.appointment.create({
    data: {
      slotId,
      patientId,
      notes,
      status: 'PENDING',
      type: 'CONSULTATION',
    },
  });
}

}