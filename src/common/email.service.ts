import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly from = process.env.RESEND_FROM || 'Ibogha Santé <no-reply@ibogha241.ga>';

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      this.logger.warn('RESEND_API_KEY non configuré — les emails ne seront pas envoyés');
    }
  }

  private getFrontendUrl(role?: string): string {
    const PRO_ROLES = ['DOCTOR', 'SECRETARY', 'FACILITY_MANAGER', 'PHARMACY', 'HOSPITAL'];
    const ADMIN_ROLES = ['ADMIN', 'ADMIN_READ', 'ADMIN_WRITE', 'GUEST'];
    if (role && ADMIN_ROLES.includes(role)) {
      return process.env.FRONTEND_ADMIN_URL || process.env.FRONTEND_PRO_URL || 'https://admin.ibogha241.ga';
    }
    if (role && PRO_ROLES.includes(role)) {
      return process.env.FRONTEND_PRO_URL || 'https://pro.ibogha241.ga';
    }
    return process.env.FRONTEND_URL || 'https://patient.ibogha241.ga';
  }

  private async send(to: string, subject: string, html: string): Promise<{ success: boolean; id?: string }> {
    if (!this.resend) {
      this.logger.warn(`Email skipped (no API key): ${subject} → ${to}`);
      return { success: false };
    }
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });
    if (error) {
      this.logger.error(`Resend error sending to ${to}: ${error.message}`);
      throw new Error(error.message);
    }
    this.logger.log(`Email sent to ${to}: ${data?.id}`);
    return { success: true, id: data?.id };
  }

  async sendVerificationEmail(email: string, token: string, fullName?: string, role?: string) {
    const frontendUrl = this.getFrontendUrl(role);
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    return this.send(email, 'Confirmez votre adresse email', `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .button { display: inline-block; padding: 15px 30px; background: #0d9488; color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; }
        </style></head>
        <body>
          <div class="header"><h1>Bienvenue ${fullName ? fullName : ''}!</h1></div>
          <div class="content">
            <h2>Confirmez votre adresse email</h2>
            <p>Merci de vous être inscrit sur Ibogha Santé. Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
            <div style="text-align:center;"><a href="${verificationUrl}" class="button">Confirmer mon email</a></div>
            <p>Si le bouton ne fonctionne pas, copiez ce lien :</p>
            <p style="word-break:break-all;color:#0d9488;">${verificationUrl}</p>
            <div class="warning"><strong>⚠️ Important :</strong> Ce lien est valide pendant <strong>1 heure</strong>.</div>
            <p style="margin-top:30px;">Si vous n'avez pas créé de compte, ignorez cet email.</p>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p><p>Envoyé à ${email}</p></div>
        </body>
      </html>
    `);
  }

  async sendPasswordResetEmail(email: string, token: string, fullName?: string, role?: string) {
    const frontendUrl = this.getFrontendUrl(role);
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    return this.send(email, 'Réinitialisation de votre mot de passe', `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .button { display: inline-block; padding: 15px 30px; background: #f5576c; color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; }
        </style></head>
        <body>
          <div class="header"><h1>Réinitialisation du mot de passe</h1></div>
          <div class="content">
            <p>Bonjour ${fullName ? fullName : ''},</p>
            <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
            <div style="text-align:center;"><a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a></div>
            <p>Si le bouton ne fonctionne pas, copiez ce lien :</p>
            <p style="word-break:break-all;color:#f5576c;">${resetUrl}</p>
            <div class="warning"><strong>⚠️ Important :</strong> Ce lien est valide pendant <strong>1 heure</strong>.</div>
            <p style="margin-top:30px;"><strong>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</strong></p>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
        </body>
      </html>
    `);
  }

  async sendAppointmentReminder(email: string, patientName: string, doctorName: string, appointmentDate: Date, appointmentType: string) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return this.send(email, 'Rappel de rendez-vous', `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .appt { background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head>
      <body>
        <div class="header"><h1>🔔 Rappel de rendez-vous</h1></div>
        <div class="content">
          <p>Bonjour ${patientName},</p>
          <p>Vous avez un rendez-vous demain :</p>
          <div class="appt">
            <p style="margin:8px 0;"><strong>📅 Date :</strong> ${formattedDate}</p>
            <p style="margin:8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
            <p style="margin:8px 0;"><strong>🏥 Type :</strong> ${appointmentType}</p>
          </div>
          <p>Si vous ne pouvez pas honorer ce rendez-vous, merci de nous prévenir via votre espace patient.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
      </body></html>
    `);
  }

  async sendAppointmentConfirmation(email: string, patientName: string, doctorName: string, appointmentDate: Date, appointmentType: string) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return this.send(email, 'Confirmation de rendez-vous', `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .appt { background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head>
      <body>
        <div class="header"><h1>✅ Rendez-vous confirmé</h1></div>
        <div class="content">
          <p>Bonjour ${patientName},</p>
          <p>Votre rendez-vous a bien été confirmé :</p>
          <div class="appt">
            <p style="margin:8px 0;"><strong>📅 Date :</strong> ${formattedDate}</p>
            <p style="margin:8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
            <p style="margin:8px 0;"><strong>🏥 Type :</strong> ${appointmentType}</p>
          </div>
          <p>Merci de votre confiance.<br>L'équipe Ibogha Santé</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
      </body></html>
    `);
  }

  async sendAppointmentCancellation(email: string, patientName: string, doctorName: string, appointmentDate: Date, appointmentType: string, reason?: string) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return this.send(email, 'Annulation de rendez-vous', `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .appt { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head>
      <body>
        <div class="header"><h1>❌ Rendez-vous annulé</h1></div>
        <div class="content">
          <p>Bonjour ${patientName},</p>
          <p>Votre rendez-vous a été annulé :</p>
          <div class="appt">
            <p style="margin:8px 0;"><strong>📅 Date :</strong> ${formattedDate}</p>
            <p style="margin:8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
            <p style="margin:8px 0;"><strong>🏥 Type :</strong> ${appointmentType}</p>
            ${reason ? `<p style="margin:8px 0;"><strong>💬 Raison :</strong> ${reason}</p>` : ''}
          </div>
          <p>Vous pouvez prendre un nouveau rendez-vous sur notre plateforme.<br>L'équipe Ibogha Santé</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
      </body></html>
    `);
  }

  async sendAppointmentRescheduled(email: string, patientName: string, doctorName: string, oldDate: Date, newDate: Date, appointmentType: string) {
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return this.send(email, 'Rendez-vous reporté', `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .appt { background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head>
      <body>
        <div class="header"><h1>🔄 Rendez-vous reporté</h1></div>
        <div class="content">
          <p>Bonjour ${patientName},</p>
          <p>Votre rendez-vous a été reporté :</p>
          <div class="appt">
            <p style="margin:8px 0;"><strong>📅 Ancienne date :</strong> <del>${fmt(oldDate)}</del></p>
            <p style="margin:8px 0;"><strong>📅 Nouvelle date :</strong> <span style="color:#ea580c;font-weight:bold;">${fmt(newDate)}</span></p>
            <p style="margin:8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
            <p style="margin:8px 0;"><strong>🏥 Type :</strong> ${appointmentType}</p>
          </div>
          <p>Merci de votre compréhension.<br>L'équipe Ibogha Santé</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
      </body></html>
    `);
  }

  async sendAdminPasswordReset(email: string, userName: string, tempPassword: string) {
    return this.send(email, 'Votre mot de passe a été réinitialisé', `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .pwd-box { background: #1e1b4b; color: #a5b4fc; font-family: monospace; font-size: 22px; font-weight: bold; letter-spacing: 3px; padding: 18px 24px; border-radius: 8px; text-align: center; margin: 24px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 13px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head>
      <body>
        <div class="header"><h1>🔑 Réinitialisation de mot de passe</h1></div>
        <div class="content">
          <p>Bonjour ${userName},</p>
          <p>Un administrateur a réinitialisé votre mot de passe. Voici votre mot de passe temporaire :</p>
          <div class="pwd-box">${tempPassword}</div>
          <p>Connectez-vous avec ce mot de passe, puis changez-le immédiatement.</p>
          <div class="warning"><strong>⚠️ Important :</strong><ul style="margin:8px 0 0;padding-left:20px;">
            <li>Valable <strong>30 minutes</strong>.</li>
            <li>Ne partagez jamais votre mot de passe.</li>
          </ul></div>
          <p style="margin-top:24px;">Cordialement,<br>L'équipe Ibogha Santé</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
      </body></html>
    `);
  }

  async sendAppointmentPending(email: string, patientName: string, doctorName: string, appointmentDate: Date, appointmentType: string) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return this.send(email, 'Demande de rendez-vous reçue', `
      <!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
        .appt { background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style></head>
      <body>
        <div class="header"><h1>⏳ Demande de rendez-vous reçue</h1></div>
        <div class="content">
          <p>Bonjour ${patientName},</p>
          <p>Votre demande est en attente de confirmation :</p>
          <div class="appt">
            <p style="margin:8px 0;"><strong>📅 Date :</strong> ${formattedDate}</p>
            <p style="margin:8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
            <p style="margin:8px 0;"><strong>🏥 Type :</strong> ${appointmentType}</p>
            <p style="margin:12px 0 0;"><span class="badge">En attente de confirmation</span></p>
          </div>
          <p>Vous recevrez un email dès confirmation du médecin.<br>L'équipe Ibogha Santé</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
      </body></html>
    `);
  }

  async sendDoctorNewBookingNotification(doctorEmail: string, doctorName: string, patientName: string, appointmentDate: Date, appointmentType: string, autoConfirmed: boolean) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    try {
      return await this.send(doctorEmail, `Nouveau rendez-vous — ${patientName}`, `
        <!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .appt { background: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
          .badge-ok { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
          .badge-wait { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style></head>
        <body>
          <div class="header"><h1>📅 Nouveau rendez-vous</h1></div>
          <div class="content">
            <p>Bonjour Dr. ${doctorName},</p>
            <p>Un patient a pris rendez-vous sur votre agenda :</p>
            <div class="appt">
              <p style="margin:8px 0;"><strong>👤 Patient :</strong> ${patientName}</p>
              <p style="margin:8px 0;"><strong>📅 Date :</strong> ${formattedDate}</p>
              <p style="margin:8px 0;"><strong>🏥 Type :</strong> ${appointmentType}</p>
              <p style="margin:12px 0 0;">${autoConfirmed ? '<span class="badge-ok">Auto-confirmé</span>' : '<span class="badge-wait">En attente de votre confirmation</span>'}</p>
            </div>
            ${!autoConfirmed ? '<p><strong>Action requise :</strong> Confirmez ou refusez ce rendez-vous depuis votre espace professionnel.</p>' : ''}
            <p>Cordialement,<br>L'équipe Ibogha Santé</p>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Ibogha Santé — Gabon</p></div>
        </body></html>
      `);
    } catch {
      // Non-fatal
    }
  }

  async sendTeamInvitation(email: string, inviterName: string, memberName: string, role: string, userAlreadyExists = false) {
    const frontendUrl = process.env.FRONTEND_PRO_URL || 'https://pro.ibogha241.ga';
    const actionUrl = userAlreadyExists ? `${frontendUrl}/auth/login` : `${frontendUrl}/auth/login?tab=register`;
    const actionLabel = userAlreadyExists ? 'Voir ma notification' : 'Créer mon compte';
    const bodyText = userAlreadyExists
      ? `<strong>${inviterName}</strong> vous a ajouté à son équipe en tant que <strong>${role}</strong>.`
      : `<strong>${inviterName}</strong> vous invite à rejoindre son équipe en tant que <strong>${role}</strong>.`;

    return this.send(email, `Invitation à rejoindre l'équipe de ${inviterName}`, `
      <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
        <div style="background:linear-gradient(135deg,#0d9488,#0891b2);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;">Ibogha Santé</h1>
        </div>
        <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p>Bonjour ${memberName},</p>
          <p>${bodyText}</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${actionUrl}" style="background:#0d9488;color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">${actionLabel}</a>
          </div>
          <p style="color:#64748b;font-size:14px;">Si vous n'avez pas demandé cette invitation, ignorez cet email.</p>
          <p>Cordialement,<br>L'équipe Ibogha Santé</p>
        </div>
      </body></html>
    `);
  }

  async sendAccountDeletionConfirmation(email: string, fullName?: string) {
    try {
      await this.send(email, 'Confirmation de suppression de votre compte', `
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
          <div style="background:linear-gradient(135deg,#0d9488,#0891b2);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;">Ibogha 241</h1>
          </div>
          <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            <p>Bonjour ${fullName || 'Utilisateur'},</p>
            <p>Nous avons bien reçu votre demande de suppression de compte.</p>
            <p>Votre compte et toutes vos données personnelles seront définitivement supprimés.</p>
            <p style="color:#64748b;font-size:14px;">Si vous n'êtes pas à l'origine de cette demande, contactez-nous à <a href="mailto:support@ibogha241.ga" style="color:#0d9488;">support@ibogha241.ga</a>.</p>
            <p>Cordialement,<br>L'équipe Ibogha Santé</p>
          </div>
        </body></html>
      `);
    } catch {
      // Non-fatal
    }
  }

  async sendRaw(to: string, subject: string, htmlBody: string) {
    try {
      await this.send(to, subject, `
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
          <div style="background:linear-gradient(135deg,#0d9488,#0891b2);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;">Ibogha 241</h1>
          </div>
          <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            ${htmlBody}
          </div>
        </body></html>
      `);
      return { success: true };
    } catch {
      return { success: false };
    }
  }
}
