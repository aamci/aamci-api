import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../common/email.service';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

export type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN' | 'FACILITY_MANAGER' | 'ADMIN_READ' | 'ADMIN_WRITE' | 'GUEST' | 'SECRETARY';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  async register(email: string, password: string, role: Role = 'PATIENT', fullName?: string, ipAddress?: string, consentedToTerms = false) {
    const exists = await this.users.findByEmail(email);

    // Compte en attente de suppression → réactivation
    if (exists && !(exists as any).isActive && (exists as any).scheduledDeletionAt) {
      const hash = await argon2.hash(password);
      await this.prisma.user.update({
        where: { id: exists.id },
        data: {
          isActive: true,
          deletedAt: null,
          scheduledDeletionAt: null,
          password: hash,
          fullName: fullName ?? exists.fullName,
          emailVerified: false,
          verificationToken: null,
          tokenExpiry: null,
        } as any,
      });
      // Renvoyer la vérification email pour le compte réactivé
      const token = require('crypto').randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1);
      await this.prisma.user.update({
        where: { id: exists.id },
        data: { verificationToken: token, tokenExpiry: expiry },
      });
      await this.email.sendVerificationEmail(exists.email, token, fullName ?? exists.fullName ?? undefined, exists.role);
      return {
        message: 'Compte réactivé. Vérifiez votre email pour confirmer.',
        email: exists.email,
        requiresVerification: true,
      };
    }

    if (exists) {
      throw new ConflictException('Email already registered');
    }

    // Générer un token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Expire dans 1h

    // crée l'utilisateur (le UsersService doit hasher)
    const user = await this.users.create(email, password, role, fullName);

    // Mettre à jour avec le token de vérification
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        tokenExpiry,
      },
    });

    // Enregistrer le consentement (CARE obligatoire + EMAIL_COMMUNICATION si accepté)
    const now = new Date();
    if (role === 'PATIENT') {
      await (this.prisma as any).patientConsent.createMany({
        data: [
          {
            patientId: user.id,
            type: 'CARE',
            granted: true,
            grantedAt: now,
            signedAt: now,
            ipAddress: ipAddress ?? 'unknown',
          },
          {
            patientId: user.id,
            type: 'EMAIL_COMMUNICATION',
            granted: consentedToTerms,
            grantedAt: consentedToTerms ? now : null,
            signedAt: consentedToTerms ? now : null,
            ipAddress: ipAddress ?? 'unknown',
          },
        ],
        skipDuplicates: true,
      });
    }

    // Envoyer l'email de vérification
    try {
      await this.email.sendVerificationEmail(email, verificationToken, user.fullName || undefined, user.role);
    } catch (error) {
      // Log l'erreur mais ne bloque pas l'inscription
      console.error('Failed to send verification email:', error);
    }

    // Ne pas connecter automatiquement, attendre la vérification
    return {
      message: 'Registration successful. Please check your email to verify your account.',
      email: user.email,
      requiresVerification: true,
    };
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<
    { access_token: string; requiresTwoFactor?: never } |
    { requiresTwoFactor: true; tempToken: string; access_token?: never }
  > {
    const logAuth = async (userId: string | null, success: boolean, reason: string) => {
      try {
        await (this.prisma as any).authLog.create({
          data: { userId, email, success, ipAddress, userAgent, reason },
        });
      } catch {}
    };

    const user = await this.users.findByEmail(email);
    if (!user) {
      await logAuth(null, false, 'USER_NOT_FOUND');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive && (user as any).scheduledDeletionAt) {
      await logAuth(user.id, false, 'ACCOUNT_SCHEDULED_DELETION');
      throw new UnauthorizedException(
        'Ce compte est en cours de suppression. Vos données seront effacées dans 30 jours. Contactez support@ibogha241.ga pour annuler.',
      );
    }

    if (!user.password) {
      await logAuth(user.id, false, 'SOCIAL_LOGIN_ONLY');
      throw new UnauthorizedException('Please use social login (Google or Facebook)');
    }

    const ok = await this.users.validatePassword(user.password, password);
    if (!ok) {
      await logAuth(user.id, false, 'INVALID_PASSWORD');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      await logAuth(user.id, false, 'EMAIL_NOT_VERIFIED');
      throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    // Check if 2FA is enabled → return a short-lived temp token instead of the real JWT
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: user.id },
      select: { isEnabled: true },
    });

    if (twoFactor?.isEnabled) {
      await logAuth(user.id, true, '2FA_PENDING');
      const tempToken = this.jwt.sign(
        { sub: user.id, email: user.email, role: user.role, twoFactorPending: true },
        { secret: process.env.JWT_SECRET || 'changeme', expiresIn: '5m' },
      );
      return { requiresTwoFactor: true, tempToken };
    }

    await logAuth(user.id, true, 'SUCCESS');
    return this.sign(user.id, user.email, user.role as Role);
  }

  async loginWith2fa(tempToken: string, code: string) {
    let payload: { sub: string; email: string; role: Role; twoFactorPending: boolean };
    try {
      payload = this.jwt.verify(tempToken, {
        secret: process.env.JWT_SECRET || 'changeme',
      }) as any;
    } catch {
      throw new UnauthorizedException('Session expirée. Veuillez recommencer la connexion.');
    }

    if (!payload.twoFactorPending) {
      throw new UnauthorizedException('Token invalide');
    }

    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: payload.sub },
    });

    if (!twoFactor?.isEnabled || !twoFactor.secret) {
      throw new UnauthorizedException('2FA non configurée');
    }

    if (twoFactor.lockedUntil && twoFactor.lockedUntil > new Date()) {
      throw new UnauthorizedException('Compte temporairement bloqué suite à trop de tentatives. Réessayez dans 15 minutes.');
    }

    const isValidTOTP = this.verifyTOTP(twoFactor.secret, code);

    if (isValidTOTP) {
      await this.prisma.twoFactorAuth.update({
        where: { userId: payload.sub },
        data: { lastUsedAt: new Date(), failedAttempts: 0, lockedUntil: null },
      });
      return this.sign(payload.sub, payload.email, payload.role);
    }

    // Check backup code
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const backupIdx = twoFactor.backupCodes.indexOf(hashedCode);
    if (backupIdx !== -1) {
      const updatedCodes = [...twoFactor.backupCodes];
      updatedCodes.splice(backupIdx, 1);
      await this.prisma.twoFactorAuth.update({
        where: { userId: payload.sub },
        data: { backupCodes: updatedCodes, lastUsedAt: new Date(), failedAttempts: 0, lockedUntil: null },
      });
      return this.sign(payload.sub, payload.email, payload.role);
    }

    // Failed attempt
    const newFailed = twoFactor.failedAttempts + 1;
    const lockUntil = newFailed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await this.prisma.twoFactorAuth.update({
      where: { userId: payload.sub },
      data: { failedAttempts: newFailed, lockedUntil: lockUntil },
    });

    throw new UnauthorizedException(
      lockUntil ? 'Trop de tentatives. Compte bloqué 15 minutes.' : 'Code invalide.',
    );
  }

  private verifyTOTP(secret: string, code: string, window = 1): boolean {
    const now = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    for (let i = -window; i <= window; i++) {
      const counter = Math.floor((now + i * timeStep) / timeStep);
      if (this.generateTOTP(secret, counter) === code) return true;
    }
    return false;
  }

  private generateTOTP(secret: string, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(buffer);
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    return (binary % 1_000_000).toString().padStart(6, '0');
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Vérifier si le token a expiré
    if (user.tokenExpiry && user.tokenExpiry < new Date()) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    // Marquer l'email comme vérifié
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        tokenExpiry: null,
      },
    });

    // Générer un JWT pour connecter automatiquement l'utilisateur
    return this.sign(user.id, user.email, user.role as Role);
  }

  async resendVerificationEmail(email: string) {
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Générer un nouveau token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Expire dans 1h

    // Mettre à jour le token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        tokenExpiry,
      },
    });

    // Renvoyer l'email
    await this.email.sendVerificationEmail(email, verificationToken, user.fullName || undefined, user.role);

    return {
      message: 'Verification email sent. Please check your inbox.',
      email: user.email,
    };
  }

  async oauthLogin(oauthUser: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    provider: string;
    providerId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }) {
    // Créer ou trouver l'utilisateur via OAuth
    const user = await this.users.findOrCreateOAuthUser({
      email: oauthUser.email,
      fullName: oauthUser.fullName,
      avatarUrl: oauthUser.avatarUrl,
      provider: oauthUser.provider,
      providerAccountId: oauthUser.providerId,
      accessToken: oauthUser.accessToken,
      refreshToken: oauthUser.refreshToken,
      expiresAt: oauthUser.expiresAt,
    });

    return this.sign(user.id, user.email, user.role as Role);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    // Anti-enumeration: always return without error even if user not found
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetExpiry,
      } as any,
    });

    try {
      await this.email.sendPasswordResetEmail(email, resetToken, user.fullName || undefined, user.role);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: token } as any,
    });

    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const expiry = (user as any).resetPasswordExpiry as Date | null;
    if (!expiry || expiry < new Date()) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const hash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      } as any,
    });
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        city: true,
      },
    });
  }

  async getDeletionStatus(userId: string): Promise<{ hasPendingDeletion: boolean; scheduledDeletionAt: string | null }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Compte introuvable');
    const scheduled = (user as any).scheduledDeletionAt as Date | null;
    return {
      hasPendingDeletion: !!scheduled,
      scheduledDeletionAt: scheduled ? scheduled.toISOString() : null,
    };
  }

  async cancelDeletion(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Compte introuvable');
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true, deletedAt: null, scheduledDeletionAt: null } as any,
    });
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Compte introuvable');
    }
    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        scheduledDeletionAt,
      } as any,
    });
    try {
      await this.email.sendAccountDeletionConfirmation(user.email, user.fullName || undefined);
    } catch (error) {
      console.error('Failed to send account deletion email:', error);
    }
  }

  private sign(sub: string, email: string, role: Role) {
    const access_token = this.jwt.sign(
      { sub, email, role },
      {
        // secret + durée éventuelle
        secret: process.env.JWT_SECRET || 'changeme',
        expiresIn: '7d',
      },
    );
    return { access_token };
  }
}