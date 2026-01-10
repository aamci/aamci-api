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

  // créer un rendez-vous avec création automatique du slot
  async createWithNewSlot(data: {
    patientId: string;
    slotStart: string;
    slotEnd: string;
    kindId?: string;
    notes?: string;
    doctorId?: string;
  }) {
    // Déterminer le doctorId (ownerId du slot)
    let ownerId = data.doctorId;

    if (!ownerId) {
      // Si pas de doctorId, on ne peut pas créer le slot
      throw new ForbiddenException('Un docteur doit être spécifié pour créer un slot');
    }

    const requestedStart = new Date(data.slotStart);
    const requestedEnd = new Date(data.slotEnd);

    // Vérifier s'il existe déjà un slot qui chevauche cette période
    const existingSlots = await this.prisma.availabilitySlot.findMany({
      where: {
        ownerId: ownerId,
        ownerType: 'DOCTOR',
        OR: [
          {
            AND: [
              { start: { lte: requestedStart } },
              { end: { gt: requestedStart } },
            ],
          },
          {
            AND: [
              { start: { lt: requestedEnd } },
              { end: { gte: requestedEnd } },
            ],
          },
          {
            AND: [
              { start: { gte: requestedStart } },
              { end: { lte: requestedEnd } },
            ],
          },
        ],
      },
      include: {
        appointments: {
          where: {
            status: { not: 'CANCELLED' },
          },
        },
      },
    });

    // Si un slot existe avec des rendez-vous actifs, refuser
    const hasActiveAppointments = existingSlots.some(
      (slot) => slot.appointments.length > 0
    );

    if (hasActiveAppointments) {
      throw new ForbiddenException('Ce créneau est déjà réservé');
    }

    // Créer d'abord le slot
    const slot = await this.prisma.availabilitySlot.create({
      data: {
        ownerId: ownerId,
        ownerType: 'DOCTOR',
        start: requestedStart,
        end: requestedEnd,
        capacity: 1,
        status: 'ACTIVE',
      },
    });

    // Puis créer le rendez-vous avec le slotId
    return this.prisma.appointment.create({
      data: {
        slotId: slot.id,
        patientId: data.patientId,
        kindId: data.kindId,
        notes: data.notes,
        status: 'PENDING',
        type: 'CONSULTATION',
      },
      include: {
        slot: true,
        patient: true,
        kind: true,
      },
    });
  }

  // ✅ DOCTOR / HOSPITAL change le statut d'un RDV qui est sur son slot
  async updateStatusAsOwner(appointmentId: string, requesterId: string, status: AppointmentStatus) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        slot: {
          include: {
            appointments: true,
          },
        },
      },
    });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable');

    // contrôle de propriété : le créneau doit appartenir au médecin connecté
    if (appt.slot.ownerId !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez modifier que les rendez-vous de vos créneaux.');
    }

    // Mettre à jour le statut du rendez-vous
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    // Si le rendez-vous est annulé et c'est le seul rendez-vous sur ce slot, supprimer le slot
    if (status === 'CANCELLED' && appt.slot.appointments.length === 1) {
      await this.prisma.availabilitySlot.delete({
        where: { id: appt.slot.id },
      });
    }

    return updatedAppointment;
  }

  // ✅ DOCTOR / HOSPITAL déplace un RDV (change l'heure de début du slot ou crée un nouveau slot selon ton modèle)
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

  // ✅ DOCTOR / HOSPITAL modifie un RDV
  async updateAsOwner(
    appointmentId: string,
    requesterId: string,
    data: {
      slotStart?: string;
      slotEnd?: string;
      patientId?: string;
      kindId?: string;
      notes?: string;
    }
  ) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        slot: {
          include: {
            appointments: true,
          },
        },
      },
    });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable');

    if (appt.slot.ownerId !== requesterId) {
      throw new ForbiddenException('Vous ne pouvez modifier que les rendez-vous de vos créneaux.');
    }

    // Si les horaires changent (déplacement), créer un nouveau slot
    if (data.slotStart && data.slotEnd) {
      const oldSlotId = appt.slot.id;
      const hasOtherAppointments = appt.slot.appointments.length > 1;

      const requestedStart = new Date(data.slotStart);
      const requestedEnd = new Date(data.slotEnd);

      // Vérifier s'il existe déjà un slot qui chevauche cette période
      const existingSlots = await this.prisma.availabilitySlot.findMany({
        where: {
          ownerId: appt.slot.ownerId,
          ownerType: 'DOCTOR',
          OR: [
            {
              AND: [
                { start: { lte: requestedStart } },
                { end: { gt: requestedStart } },
              ],
            },
            {
              AND: [
                { start: { lt: requestedEnd } },
                { end: { gte: requestedEnd } },
              ],
            },
            {
              AND: [
                { start: { gte: requestedStart } },
                { end: { lte: requestedEnd } },
              ],
            },
          ],
        },
        include: {
          appointments: {
            where: {
              status: { not: 'CANCELLED' },
            },
          },
        },
      });

      // Si un slot existe avec des rendez-vous actifs, refuser
      const hasActiveAppointments = existingSlots.some(
        (slot) => slot.appointments.length > 0
      );

      if (hasActiveAppointments) {
        throw new ForbiddenException('Ce créneau est déjà réservé');
      }

      // Créer un nouveau slot pour le rendez-vous déplacé
      const newSlot = await this.prisma.availabilitySlot.create({
        data: {
          ownerId: appt.slot.ownerId,
          ownerType: appt.slot.ownerType,
          start: requestedStart,
          end: requestedEnd,
          capacity: 1,
          status: 'ACTIVE',
        },
      });

      // Mettre à jour le rendez-vous avec le nouveau slot
      const updateData: any = { slotId: newSlot.id };
      if (data.patientId) updateData.patientId = data.patientId;
      if (data.kindId) updateData.kindId = data.kindId;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
        include: {
          patient: true,
          slot: true,
          kind: true,
        },
      });

      // Supprimer l'ancien slot seulement s'il n'a plus de rendez-vous
      if (!hasOtherAppointments) {
        await this.prisma.availabilitySlot.delete({
          where: { id: oldSlotId },
        });
      }

      return updatedAppointment;
    }

    // Sinon, juste mettre à jour les infos du rendez-vous
    const updateData: any = {};
    if (data.patientId) updateData.patientId = data.patientId;
    if (data.kindId) updateData.kindId = data.kindId;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        patient: true,
        slot: true,
        kind: true,
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