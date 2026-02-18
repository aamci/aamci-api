import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configuration du transporteur email
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, fullName?: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Plateforme Santé" <${process.env.SMTP_USER}>`,
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
              <p>© ${new Date().getFullYear()} Plateforme Santé. Tous droits réservés.</p>
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

        © ${new Date().getFullYear()} Plateforme Santé
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

  async sendPasswordResetEmail(email: string, token: string, fullName?: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Plateforme Santé" <${process.env.SMTP_USER}>`,
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
              <p>© ${new Date().getFullYear()} Plateforme Santé. Tous droits réservés.</p>
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
      from: `"Plateforme Santé" <${process.env.SMTP_USER}>`,
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
              <p>Cordialement,<br>L'équipe Health Platform</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Plateforme Santé. Tous droits réservés.</p>
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
      from: `"Plateforme Santé" <${process.env.SMTP_USER}>`,
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
              <p>Cordialement,<br>L'équipe Health Platform</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Plateforme Santé. Tous droits réservés.</p>
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
      from: `"Plateforme Santé" <${process.env.SMTP_USER}>`,
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
              <p>Cordialement,<br>L'équipe Health Platform</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Plateforme Santé. Tous droits réservés.</p>
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
      from: `"Plateforme Santé" <${process.env.SMTP_USER}>`,
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
              <p>Cordialement,<br>L'équipe Health Platform</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Plateforme Santé. Tous droits réservés.</p>
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

  async sendTeamInvitation(
    email: string,
    inviterName: string,
    memberName: string,
    role: string,
  ) {
    const frontendUrl = process.env.FRONTEND_PRO_URL || 'http://localhost:3002';

    const mailOptions = {
      from: `"Plateforme Santé" <${process.env.SMTP_USER || 'noreply@healthplatform.com'}>`,
      to: email,
      subject: `Invitation à rejoindre l'équipe de ${inviterName}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <div style="background: linear-gradient(135deg, #0d9488, #0891b2); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">Plateforme Santé</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p>Bonjour ${memberName},</p>
              <p><strong>${inviterName}</strong> vous invite à rejoindre son équipe en tant que <strong>${role}</strong>.</p>
              <p>Cliquez sur le bouton ci-dessous pour accepter l'invitation et accéder à la plateforme :</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${frontendUrl}/auth/register" style="background: #0d9488; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accepter l'invitation</a>
              </div>
              <p style="color: #64748b; font-size: 14px;">Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.</p>
              <p>Cordialement,<br>L'équipe Health Platform</p>
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
}
