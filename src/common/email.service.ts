import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.free.fr',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('SMTP_USER / SMTP_PASS non configurés — les emails ne seront pas envoyés');
    }
  }

  private getFrontendUrl(role?: string): string {
    const PRO_ROLES = ['DOCTOR', 'SECRETARY', 'FACILITY_MANAGER', 'PHARMACY', 'HOSPITAL'];
    const ADMIN_ROLES = ['ADMIN', 'ADMIN_READ', 'ADMIN_WRITE', 'GUEST'];
    if (role && ADMIN_ROLES.includes(role)) {
      return process.env.FRONTEND_ADMIN_URL || process.env.FRONTEND_PRO_URL || 'http://localhost:3003';
    }
    if (role && PRO_ROLES.includes(role)) {
      return process.env.FRONTEND_PRO_URL || 'http://localhost:3002';
    }
    return process.env.FRONTEND_URL || 'http://localhost:3001';
  }

  async sendVerificationEmail(email: string, token: string, fullName?: string, role?: string) {
    const frontendUrl = this.getFrontendUrl(role);
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Confirmez votre adresse email',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .button {
                display: inline-block;
                padding: 15px 30px;
                background: #667eea;
                color: white !important;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
              .warning {
                background: #fff3cd;
                border: 1px solid #ffc107;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Bienvenue ${fullName ? fullName : ''}!</h1>
            </div>
            <div class="content">
              <h2>Confirmez votre adresse email</h2>
              <p>Merci de vous être inscrit sur notre plateforme de santé. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>

              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Confirmer mon email</a>
              </div>

              <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>

              <div class="warning">
                <strong>⚠️ Important :</strong> Ce lien est valide pendant <strong>1 heure</strong>. Après ce délai, vous devrez demander un nouvel email de vérification.
              </div>

              <p style="margin-top: 30px;">Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
              <p>Cet email a été envoyé à ${email}</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Bienvenue ${fullName ? fullName : ''}!

        Confirmez votre adresse email

        Merci de vous être inscrit sur notre plateforme de santé. Pour activer votre compte, veuillez cliquer sur ce lien :

        ${verificationUrl}

        ⚠️ Important : Ce lien est valide pendant 1 heure.

        Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.

        © ${new Date().getFullYear()} Ibogha Santé
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string, fullName?: string, role?: string) {
    const frontendUrl = this.getFrontendUrl(role);
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .button {
                display: inline-block;
                padding: 15px 30px;
                background: #f5576c;
                color: white !important;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
              .warning {
                background: #fff3cd;
                border: 1px solid #ffc107;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Réinitialisation du mot de passe</h1>
            </div>
            <div class="content">
              <p>Bonjour ${fullName ? fullName : ''},</p>
              <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>

              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </div>

              <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>

              <div class="warning">
                <strong>⚠️ Important :</strong> Ce lien est valide pendant <strong>1 heure</strong>.
              </div>

              <p style="margin-top: 30px;"><strong>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendAppointmentReminder(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentType: string,
  ) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Rappel de rendez-vous - Health Platform',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .appointment-box {
                background-color: #f0fdfa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #0d9488;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔔 Rappel de rendez-vous</h1>
            </div>
            <div class="content">
              <p>Bonjour ${patientName},</p>
              <p>Nous vous rappelons que vous avez un rendez-vous demain :</p>
              <div class="appointment-box">
                <p style="margin: 8px 0;"><strong>📅 Date et heure :</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
                <p style="margin: 8px 0;"><strong>🏥 Type de consultation :</strong> ${appointmentType}</p>
              </div>
              <p>Si vous ne pouvez pas honorer ce rendez-vous, merci de nous prévenir au plus tôt via votre espace patient.</p>
              <p>Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Appointment reminder email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send appointment reminder to ${email}:`, error);
      throw new Error('Failed to send appointment reminder');
    }
  }

  async sendAppointmentConfirmation(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentType: string,
  ) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Confirmation de rendez-vous - Health Platform',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .appointment-box {
                background-color: #f0fdfa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #0d9488;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>✅ Rendez-vous confirmé</h1>
            </div>
            <div class="content">
              <p>Bonjour ${patientName},</p>
              <p>Votre rendez-vous a bien été confirmé :</p>
              <div class="appointment-box">
                <p style="margin: 8px 0;"><strong>📅 Date et heure :</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
                <p style="margin: 8px 0;"><strong>🏥 Type de consultation :</strong> ${appointmentType}</p>
              </div>
              <p>Merci de votre confiance.</p>
              <p>Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Appointment confirmation email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send appointment confirmation to ${email}:`, error);
      throw new Error('Failed to send appointment confirmation');
    }
  }

  async sendAppointmentCancellation(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentType: string,
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

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Annulation de rendez-vous - Health Platform',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .appointment-box {
                background-color: #fef2f2;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #dc2626;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>❌ Rendez-vous annulé</h1>
            </div>
            <div class="content">
              <p>Bonjour ${patientName},</p>
              <p>Votre rendez-vous a été annulé :</p>
              <div class="appointment-box">
                <p style="margin: 8px 0;"><strong>📅 Date et heure :</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
                <p style="margin: 8px 0;"><strong>🏥 Type de consultation :</strong> ${appointmentType}</p>
                ${reason ? `<p style="margin: 8px 0;"><strong>💬 Raison :</strong> ${reason}</p>` : ''}
              </div>
              <p>Vous pouvez prendre un nouveau rendez-vous sur notre plateforme.</p>
              <p>Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Appointment cancellation email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send appointment cancellation to ${email}:`, error);
      throw new Error('Failed to send appointment cancellation');
    }
  }

  async sendAppointmentRescheduled(
    email: string,
    patientName: string,
    doctorName: string,
    oldDate: Date,
    newDate: Date,
    appointmentType: string,
  ) {
    const formattedOldDate = oldDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const formattedNewDate = newDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Rendez-vous reporté - Health Platform',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
              }
              .appointment-box {
                background-color: #fff7ed;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #ea580c;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔄 Rendez-vous reporté</h1>
            </div>
            <div class="content">
              <p>Bonjour ${patientName},</p>
              <p>Votre rendez-vous a été reporté :</p>
              <div class="appointment-box">
                <p style="margin: 8px 0;"><strong>📅 Ancienne date :</strong> <del>${formattedOldDate}</del></p>
                <p style="margin: 8px 0;"><strong>📅 Nouvelle date :</strong> <span style="color: #ea580c; font-weight: bold;">${formattedNewDate}</span></p>
                <p style="margin: 8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
                <p style="margin: 8px 0;"><strong>🏥 Type de consultation :</strong> ${appointmentType}</p>
              </div>
              <p>Merci de votre compréhension.</p>
              <p>Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Appointment rescheduled email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send appointment rescheduled email to ${email}:`, error);
      throw new Error('Failed to send appointment rescheduled email');
    }
  }

  async sendAdminPasswordReset(email: string, userName: string, tempPassword: string) {
    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Votre mot de passe a été réinitialisé',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
              .pwd-box { background: #1e1b4b; color: #a5b4fc; font-family: monospace; font-size: 22px; font-weight: bold; letter-spacing: 3px; padding: 18px 24px; border-radius: 8px; text-align: center; margin: 24px 0; }
              .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 13px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🔑 Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
              <p>Bonjour ${userName},</p>
              <p>Un administrateur a réinitialisé votre mot de passe. Voici votre mot de passe temporaire :</p>
              <div class="pwd-box">${tempPassword}</div>
              <p>Connectez-vous avec ce mot de passe, puis changez-le immédiatement depuis vos paramètres de compte.</p>
              <div class="warning">
                <strong>⚠️ Important :</strong>
                <ul style="margin: 8px 0 0; padding-left: 20px;">
                  <li>Ce mot de passe est <strong>valable 30 minutes</strong>.</li>
                  <li>Ne partagez jamais votre mot de passe.</li>
                  <li>Si vous n'avez pas demandé cette réinitialisation, contactez le support immédiatement.</li>
                </ul>
              </div>
              <p style="margin-top: 24px;">Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    const info = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Admin password reset email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  }

  async sendAppointmentPending(
    email: string,
    patientName: string,
    doctorName: string,
    appointmentDate: Date,
    appointmentType: string,
  ) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Demande de rendez-vous reçue - Health Platform',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
              .appointment-box { background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }
              .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>⏳ Demande de rendez-vous reçue</h1>
            </div>
            <div class="content">
              <p>Bonjour ${patientName},</p>
              <p>Votre demande de rendez-vous a bien été reçue et est en attente de confirmation par le médecin :</p>
              <div class="appointment-box">
                <p style="margin: 8px 0;"><strong>📅 Date et heure souhaitées :</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>👨‍⚕️ Médecin :</strong> Dr. ${doctorName}</p>
                <p style="margin: 8px 0;"><strong>🏥 Type de consultation :</strong> ${appointmentType}</p>
                <p style="margin: 12px 0 0;"><span class="badge">En attente de confirmation</span></p>
              </div>
              <p>Vous recevrez un email dès que le médecin aura confirmé ou modifié votre rendez-vous.</p>
              <p>Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Appointment pending email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send appointment pending email to ${email}:`, error);
      throw new Error('Failed to send appointment pending email');
    }
  }

  async sendDoctorNewBookingNotification(
    doctorEmail: string,
    doctorName: string,
    patientName: string,
    appointmentDate: Date,
    appointmentType: string,
    autoConfirmed: boolean,
  ) {
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER}>`,
      to: doctorEmail,
      subject: `Nouveau rendez-vous — ${patientName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
              .appointment-box { background-color: #f0fdfa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
              .badge-confirmed { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
              .badge-pending { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📅 Nouveau rendez-vous</h1>
            </div>
            <div class="content">
              <p>Bonjour Dr. ${doctorName},</p>
              <p>Un patient a pris rendez-vous sur votre agenda :</p>
              <div class="appointment-box">
                <p style="margin: 8px 0;"><strong>👤 Patient :</strong> ${patientName}</p>
                <p style="margin: 8px 0;"><strong>📅 Date et heure :</strong> ${formattedDate}</p>
                <p style="margin: 8px 0;"><strong>🏥 Type de consultation :</strong> ${appointmentType}</p>
                <p style="margin: 12px 0 0;">
                  ${autoConfirmed
                    ? '<span class="badge-confirmed">Auto-confirmé</span>'
                    : '<span class="badge-pending">En attente de votre confirmation</span>'
                  }
                </p>
              </div>
              ${!autoConfirmed ? '<p><strong>Action requise :</strong> Veuillez confirmer ou refuser ce rendez-vous depuis votre espace professionnel.</p>' : ''}
              <p>Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ibogha Santé. Tous droits réservés.</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Doctor new booking email sent to ${doctorEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send doctor new booking email to ${doctorEmail}:`, error);
      // Non-fatal: don't throw
    }
  }

  async sendTeamInvitation(
    email: string,
    inviterName: string,
    memberName: string,
    role: string,
    userAlreadyExists = false,
  ) {
    const frontendUrl = process.env.FRONTEND_PRO_URL || 'http://localhost:3002';
    const actionUrl = userAlreadyExists
      ? `${frontendUrl}/auth/login`
      : `${frontendUrl}/auth/register`;
    const actionLabel = userAlreadyExists ? 'Voir ma notification' : "Créer mon compte";
    const bodyText = userAlreadyExists
      ? `<strong>${inviterName}</strong> vous a ajouté à son équipe en tant que <strong>${role}</strong>. Connectez-vous pour accéder à votre espace.`
      : `<strong>${inviterName}</strong> vous invite à rejoindre son équipe en tant que <strong>${role}</strong>. Créez votre compte pour accepter l'invitation et accéder à la plateforme.`;

    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER || 'noreply@healthplatform.com'}>`,
      to: email,
      subject: `Invitation à rejoindre l'équipe de ${inviterName}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">Ibogha Santé</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p>Bonjour ${memberName},</p>
              <p>${bodyText}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" style="background: #0d9488; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">${actionLabel}</a>
              </div>
              <p style="color: #64748b; font-size: 14px;">Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
              <p>Cordialement,<br>L'équipe Ibogha Santé</p>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Team invitation email sent to ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send team invitation email to ${email}:`, error);
      throw new Error('Failed to send team invitation email');
    }
  }

  async sendRaw(to: string, subject: string, htmlBody: string) {
    const mailOptions = {
      from: `"Ibogha Santé" <${process.env.SMTP_USER || 'noreply@ibogha241.ga'}>`,
      to,
      subject,
      html: `
        <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
          <div style="background:linear-gradient(135deg,#0d9488,#0891b2);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;">Ibogha 241</h1>
          </div>
          <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
            ${htmlBody}
          </div>
        </body></html>
      `,
    };
    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Raw email sent to ${to}: ${info.messageId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send raw email to ${to}:`, error);
      return { success: false };
    }
  }

}
