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
    if (exists) {
      // 409 plus parlant que 401 ici
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

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Vérifier si l'utilisateur a un mot de passe (OAuth users n'en ont pas)
    if (!user.password) {
      throw new UnauthorizedException('Please use social login (Google or Facebook)');
    }

    // délègue la vérification du hash au UsersService

    const ok = await this.users.validatePassword(user.password, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // Vérifier si l'email est vérifié
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    return this.sign(user.id, user.email, user.role as Role);
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

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Compte introuvable');
    }
    await this.prisma.user.delete({ where: { id: userId } });
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