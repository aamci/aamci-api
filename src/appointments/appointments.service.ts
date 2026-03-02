// src/appointments/appointments.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DoctorAbsencesService } from '../doctor-absences/doctor-absences.service';
import { NotificationsService } from '../notifications/notifications.service';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private doctorAbsencesService: DoctorAbsencesService,
    private notificationsService: NotificationsService,
  ) {}

  // Helper pour enregistrer l'historique
  private async logHistory(
    appointmentId: string,
    action: string,
    userId: string | null,
    oldValue?: any,
    newValue?: any,
    description?: string
  ) {
    await this.prisma.appointmentHistory.create({
      data: {
        appointmentId,
        action,
        userId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        description,
      },
    });
  }

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
    beneficiaryName?: string;
    beneficiaryPhone?: string;
  }) {
    // Déterminer le doctorId (ownerId du slot)
    let ownerId = data.doctorId;

    if (!ownerId) {
      // Si pas de doctorId, on ne peut pas créer le slot
      throw new ForbiddenException('Un docteur doit être spécifié pour créer un slot');
    }

    const requestedStart = new Date(data.slotStart);
    const requestedEnd = new Date(data.slotEnd);

    // Vérifier si le médecin est absent pendant cette période
    const isAbsent = await this.doctorAbsencesService.hasAbsenceOnDate(
      ownerId,
      requestedStart,
    );

    if (isAbsent) {
      throw new BadRequestException(
        'Le médecin est absent pendant cette période. Impossible de créer un rendez-vous.',
      );
    }

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

    // Vérifier le paramètre autoConfirmPatientBookings du médecin
    const isPatientBooking = data.patientId !== ownerId;
    let initialStatus: 'CONFIRMED' | 'PENDING' = 'CONFIRMED';

    if (isPatientBooking) {
      const doctorProfile = await this.prisma.doctorProfile.findUnique({
        where: { userId: ownerId },
      });
      const autoConfirm = doctorProfile?.autoConfirmPatientBookings ?? true;
      initialStatus = autoConfirm ? 'CONFIRMED' : 'PENDING';
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        slotId: slot.id,
        patientId: data.patientId,
        kindId: data.kindId,
        notes: data.notes,
        status: initialStatus,
        type: 'CONSULTATION',
        beneficiaryName: data.beneficiaryName,
        beneficiaryPhone: data.beneficiaryPhone,
      },
      include: {
        slot: true,
        patient: true,
        kind: true,
      },
    });

    // Enregistrer dans l'historique
    await this.logHistory(
      appointment.id,
      'CREATED',
      data.patientId,
      null,
      {
        slotStart: data.slotStart,
        slotEnd: data.slotEnd,
        patientId: data.patientId,
        status: initialStatus,
      },
      isPatientBooking
        ? `Rendez-vous réservé par le patient${initialStatus === 'CONFIRMED' ? ' (auto-confirmé)' : ''}`
        : `Rendez-vous créé par le médecin pour ${appointment.patient.fullName || 'le patient'}`
    );

    // Envoyer une notification au patient
    try {
      if (initialStatus === 'CONFIRMED') {
        await this.notificationsService.createAppointmentConfirmed(
          data.patientId,
          appointment.id,
          requestedStart,
        );
      }
    } catch (error) {
      console.error('Failed to send appointment notification:', error);
    }

    return appointment;
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

    const oldStatus = appt.status;

    // Mettre à jour le statut du rendez-vous
    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });

    // Enregistrer dans l'historique
    await this.logHistory(
      appointmentId,
      'STATUS_CHANGED',
      requesterId,
      { status: oldStatus },
      { status },
      `Statut changé de ${oldStatus} à ${status}`
    );

    // Si le rendez-vous est annulé et c'est le seul rendez-vous sur ce slot, supprimer le slot
    if (status === 'CANCELLED' && appt.slot.appointments.length === 1) {
      await this.prisma.availabilitySlot.delete({
        where: { id: appt.slot.id },
      });
    }

    // Envoyer une notification au patient selon le nouveau statut
    try {
      if (status === 'CONFIRMED') {
        await this.notificationsService.createAppointmentConfirmed(
          appt.patientId,
          appointmentId,
          new Date(appt.slot.start),
        );
      } else if (status === 'CANCELLED') {
        await this.notificationsService.createAppointmentCancelled(
          appt.patientId,
          appointmentId,
          new Date(appt.slot.start),
        );
      }
    } catch (error) {
      console.error('Failed to send status change notification:', error);
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
    const oldStart = new Date(slot.start);
    const duration = new Date(slot.end).getTime() - new Date(slot.start).getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    await this.prisma.availabilitySlot.update({
      where: { id: slot.id },
      data: {
        start: newStart,
        end: newEnd,
      },
    });

    // Envoyer une notification au patient
    try {
      await this.notificationsService.createAppointmentRescheduled(
        appt.patientId,
        appointmentId,
        oldStart,
        newStart,
      );
    } catch (error) {
      console.error('Failed to send reschedule notification:', error);
    }

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

      console.log(`[MOVE] Début déplacement du rendez-vous ${appointmentId}`);
      console.log(`[MOVE] Ancien slot ${oldSlotId} a ${appt.slot.appointments.length} rendez-vous`);
      console.log(`[MOVE] hasOtherAppointments = ${hasOtherAppointments}`);

      const requestedStart = new Date(data.slotStart);
      const requestedEnd = new Date(data.slotEnd);

      // Vérifier si le médecin est absent pendant cette période
      const isAbsent = await this.doctorAbsencesService.hasAbsenceOnDate(
        appt.slot.ownerId,
        requestedStart,
      );

      if (isAbsent) {
        throw new BadRequestException(
          'Le médecin est absent pendant cette période. Impossible de déplacer le rendez-vous.',
        );
      }

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
      console.log(`[MOVE] Création d'un nouveau slot pour ${requestedStart.toISOString()} - ${requestedEnd.toISOString()}`);
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
      console.log(`[MOVE] Nouveau slot créé avec ID: ${newSlot.id}`);

      // Mettre à jour le rendez-vous avec le nouveau slot
      const updateData: any = { slotId: newSlot.id };
      if (data.patientId) updateData.patientId = data.patientId;
      if (data.kindId) updateData.kindId = data.kindId;
      if (data.notes !== undefined) updateData.notes = data.notes;

      console.log(`[MOVE] Mise à jour du rendez-vous ${appointmentId} avec nouveau slotId: ${newSlot.id}`);
      console.log(`[MOVE] Ancien slotId était: ${oldSlotId}`);

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
        include: {
          patient: true,
          slot: true,
          kind: true,
        },
      });

      console.log(`[MOVE] Rendez-vous mis à jour. Nouveau slotId confirmé: ${updatedAppointment.slotId}`);

      // Enregistrer le déplacement dans l'historique
      await this.logHistory(
        appointmentId,
        'RESCHEDULED',
        requesterId,
        {
          slotStart: appt.slot.start,
          slotEnd: appt.slot.end,
        },
        {
          slotStart: data.slotStart,
          slotEnd: data.slotEnd,
        },
        `Rendez-vous déplacé`
      );

      // Supprimer l'ancien slot seulement s'il n'a plus de rendez-vous
      // ⚠️ IMPORTANT: On recharge le slot pour vérifier qu'il n'a vraiment plus de rendez-vous
      // (car le update précédent a changé le slotId du rendez-vous)
      if (!hasOtherAppointments) {
        console.log(`[MOVE] Tentative de suppression de l'ancien slot ${oldSlotId}`);

        // Recharger le slot pour obtenir l'état à jour
        const oldSlotCheck = await this.prisma.availabilitySlot.findUnique({
          where: { id: oldSlotId },
          include: { appointments: true },
        });

        console.log(`[MOVE] Ancien slot trouvé:`, {
          id: oldSlotCheck?.id,
          appointmentsCount: oldSlotCheck?.appointments?.length,
          appointments: oldSlotCheck?.appointments?.map(a => a.id),
        });

        // Vérifier qu'il n'a vraiment aucun rendez-vous avant de supprimer
        if (oldSlotCheck && oldSlotCheck.appointments.length === 0) {
          console.log(`[MOVE] Suppression de l'ancien slot ${oldSlotId}...`);
          await this.prisma.availabilitySlot.delete({
            where: { id: oldSlotId },
          });
          console.log(`[MOVE] Ancien slot ${oldSlotId} supprimé avec succès`);
        } else {
          console.log(`[MOVE] Ancien slot ${oldSlotId} NON supprimé - a encore ${oldSlotCheck?.appointments?.length} rendez-vous`);
        }
      } else {
        console.log(`[MOVE] Ancien slot ${oldSlotId} a d'autres rendez-vous - ne sera pas supprimé`);
      }

      return updatedAppointment;
    }

    // Sinon, juste mettre à jour les infos du rendez-vous
    const updateData: any = {};
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

    // Enregistrer les modifications dans l'historique
    if (Object.keys(updateData).length > 0) {
      const oldValues: any = {};
      if (data.patientId) oldValues.patientId = appt.patientId;
      if (data.kindId) oldValues.kindId = appt.kindId;
      if (data.notes !== undefined) oldValues.notes = appt.notes;

      await this.logHistory(
        appointmentId,
        'UPDATED',
        requesterId,
        oldValues,
        updateData,
        `Rendez-vous modifié`
      );
    }

    return updatedAppointment;
  }

  // Récupérer l'historique d'un rendez-vous
  async getHistory(appointmentId: string) {
    return this.prisma.appointmentHistory.findMany({
      where: { appointmentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Récupérer un rendez-vous par ID pour un utilisateur (vérifie les permissions)
  async findByIdForUser(appointmentId: string, userId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        slot: true,
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        kind: true,
      },
    });

    if (!appt) throw new NotFoundException('Rendez-vous introuvable');

    // Vérifier que l'utilisateur a le droit de voir ce rendez-vous
    const isDoctor = appt.slot.ownerId === userId;
    const isPatient = appt.patientId === userId;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce rendez-vous');
    }

    return appt;
  }

  // Démarrer une session vidéo pour une téléconsultation
  async startVideoSession(appointmentId: string, userId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true, kind: true },
    });

    if (!appt) throw new NotFoundException('Rendez-vous introuvable');

    // Vérifier que c'est le médecin du rendez-vous
    if (appt.slot.ownerId !== userId) {
      throw new ForbiddenException('Seul le médecin peut démarrer la session vidéo');
    }

    // Générer un ID de session unique
    const videoSessionId = `visio-${appointmentId}-${Date.now()}`;

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        videoSessionId,
        videoStartedAt: new Date(),
      },
      include: {
        slot: true,
        patient: true,
        kind: true,
      },
    });

    // Enregistrer dans l'historique
    await this.logHistory(
      appointmentId,
      'VIDEO_STARTED',
      userId,
      null,
      { videoSessionId },
      'Session vidéo démarrée'
    );

    return updated;
  }

  // Terminer une session vidéo
  async endVideoSession(appointmentId: string, userId: string, notes?: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true },
    });

    if (!appt) throw new NotFoundException('Rendez-vous introuvable');

    // Vérifier que c'est le médecin du rendez-vous
    if (appt.slot.ownerId !== userId) {
      throw new ForbiddenException('Seul le médecin peut terminer la session vidéo');
    }

    const updateData: any = {
      videoEndedAt: new Date(),
    };

    // Mettre à jour les notes si fournies
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        slot: true,
        patient: true,
        kind: true,
      },
    });

    // Calculer la durée de la session
    const duration = appt.videoStartedAt
      ? Math.round((new Date().getTime() - new Date(appt.videoStartedAt).getTime()) / 1000 / 60)
      : 0;

    // Enregistrer dans l'historique
    await this.logHistory(
      appointmentId,
      'VIDEO_ENDED',
      userId,
      { videoStartedAt: appt.videoStartedAt },
      { videoEndedAt: updateData.videoEndedAt, durationMinutes: duration },
      `Session vidéo terminée (durée: ${duration} minutes)`
    );

    return updated;
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

  // 2. Vérifier le paramètre autoConfirmPatientBookings du médecin
  const doctorProfile = await this.prisma.doctorProfile.findUnique({
    where: { userId: slot.ownerId },
  });

  // Déterminer le statut initial selon le paramètre du médecin
  // Par défaut (si pas de profile), on auto-confirme
  const autoConfirm = doctorProfile?.autoConfirmPatientBookings ?? true;
  const initialStatus = autoConfirm ? 'CONFIRMED' : 'PENDING';

  const appointment = await this.prisma.appointment.create({
    data: {
      slotId,
      patientId,
      notes,
      status: initialStatus,
      type: 'CONSULTATION',
    },
    include: {
      slot: true,
      patient: true,
    },
  });

  // Enregistrer dans l'historique
  await this.logHistory(
    appointment.id,
    'CREATED',
    patientId,
    null,
    {
      slotId,
      patientId,
      status: initialStatus,
    },
    `Rendez-vous réservé par le patient${autoConfirm ? ' (auto-confirmé)' : ''}`
  );

  // Envoyer une notification au patient
  try {
    if (autoConfirm) {
      await this.notificationsService.createAppointmentConfirmed(
        patientId,
        appointment.id,
        new Date(slot.start),
      );
    }
    // Si pas auto-confirmé, on pourrait envoyer une notification "en attente de confirmation"
  } catch (error) {
    console.error('Failed to send appointment notification:', error);
  }

  return appointment;
}

}