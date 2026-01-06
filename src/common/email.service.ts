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
}
