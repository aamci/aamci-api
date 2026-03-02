import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway,
  ) {}

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto) {
    const created = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        relatedAppointmentId: dto.relatedAppointmentId,
        sentViaEmail: dto.sendEmail || false,
        emailSentAt: dto.sendEmail ? new Date() : null,
        sentViaSms: dto.sendSms || false,
        smsSentAt: dto.sendSms ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        relatedAppointment: {
          include: {
            slot: true,
            patient: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Push real-time notification via WebSocket
    try {
      this.gateway.emitToUser(dto.userId, 'new_notification', created);
    } catch {
      // Gateway may not be initialized yet (e.g. during tests)
    }

    return created;
  }

  /**
   * Get all notifications for a user
   */
  async findAllByUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      include: {
        relatedAppointment: {
          include: {
            slot: true,
            kind: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    // Verify ownership
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Delete a notification
   */
  async remove(notificationId: string, userId: string) {
    // Verify ownership
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Helper: Create appointment reminder notification
   */
  async createAppointmentReminder(
    userId: string,
    appointmentId: string,
    appointmentDate: Date,
  ) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Récupérer les informations du rendez-vous
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        slot: true,
        kind: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Récupérer le médecin via ownerId du slot
    const doctor = await this.prisma.user.findUnique({
      where: { id: appointment.slot.ownerId },
      include: { doctorProfile: true },
    });

    // Créer la notification
    const notification = await this.create({
      userId,
      type: 'APPOINTMENT_REMINDER',
      title: 'Rappel de rendez-vous',
      message: `Vous avez un rendez-vous demain le ${formattedDate}`,
      relatedAppointmentId: appointmentId,
      sendEmail: true,
    });

    // Envoyer l'email
    try {
      await this.emailService.sendAppointmentReminder(
        appointment.patient.email,
        appointment.patient.fullName || 'Patient',
        doctor?.fullName || 'Votre médecin',
        appointmentDate,
        appointment.kind?.name || 'Consultation',
      );
    } catch (error) {
      console.error('Failed to send reminder email:', error);
    }

    return notification;
  }

  /**
   * Helper: Create appointment confirmed notification
   */
  async createAppointmentConfirmed(
    userId: string,
    appointmentId: string,
    appointmentDate: Date,
  ) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Récupérer les informations du rendez-vous
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        slot: true,
        kind: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Récupérer le médecin via ownerId du slot
    const doctor = await this.prisma.user.findUnique({
      where: { id: appointment.slot.ownerId },
    });

    // Créer la notification
    const notification = await this.create({
      userId,
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Rendez-vous confirmé',
      message: `Votre rendez-vous du ${formattedDate} a été confirmé`,
      relatedAppointmentId: appointmentId,
      sendEmail: true,
    });

    // Envoyer l'email
    try {
      await this.emailService.sendAppointmentConfirmation(
        appointment.patient.email,
        appointment.patient.fullName || 'Patient',
        doctor?.fullName || 'Votre médecin',
        appointmentDate,
        appointment.kind?.name || 'Consultation',
      );
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }

    return notification;
  }

  /**
   * Helper: Create appointment cancelled notification
   */
  async createAppointmentCancelled(
    userId: string,
    appointmentId: string,
    appointmentDate: Date,
    reason?: string,
  ) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Récupérer les informations du rendez-vous
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        slot: true,
        kind: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Récupérer le médecin via ownerId du slot
    const doctor = await this.prisma.user.findUnique({
      where: { id: appointment.slot.ownerId },
    });

    // Créer la notification
    const notification = await this.create({
      userId,
      type: 'APPOINTMENT_CANCELLED',
      title: 'Rendez-vous annulé',
      message: `Votre rendez-vous du ${formattedDate} a été annulé${reason ? ` - Raison: ${reason}` : ''}`,
      relatedAppointmentId: appointmentId,
      sendEmail: true,
    });

    // Envoyer l'email
    try {
      await this.emailService.sendAppointmentCancellation(
        appointment.patient.email,
        appointment.patient.fullName || 'Patient',
        doctor?.fullName || 'Votre médecin',
        appointmentDate,
        appointment.kind?.name || 'Consultation',
        reason,
      );
    } catch (error) {
      console.error('Failed to send cancellation email:', error);
    }

    return notification;
  }

  /**
   * Helper: Create appointment rescheduled notification
   */
  async createAppointmentRescheduled(
    userId: string,
    appointmentId: string,
    oldAppointmentDate: Date,
    newAppointmentDate: Date,
  ) {
    const formattedDate = newAppointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Récupérer les informations du rendez-vous
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        slot: true,
        kind: true,
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Récupérer le médecin via ownerId du slot
    const doctor = await this.prisma.user.findUnique({
      where: { id: appointment.slot.ownerId },
    });

    // Créer la notification
    const notification = await this.create({
      userId,
      type: 'APPOINTMENT_RESCHEDULED',
      title: 'Rendez-vous déplacé',
      message: `Votre rendez-vous a été déplacé au ${formattedDate}`,
      relatedAppointmentId: appointmentId,
      sendEmail: true,
    });

    // Envoyer l'email
    try {
      await this.emailService.sendAppointmentRescheduled(
        appointment.patient.email,
        appointment.patient.fullName || 'Patient',
        doctor?.fullName || 'Votre médecin',
        oldAppointmentDate,
        newAppointmentDate,
        appointment.kind?.name || 'Consultation',
      );
    } catch (error) {
      console.error('Failed to send rescheduled email:', error);
    }

    return notification;
  }
}
