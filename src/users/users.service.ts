import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as argon2 from 'argon2';
import { Role } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }


  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async create(email: string, password: string, role: Role) {
    const hash = await argon2.hash(password);
    return this.prisma.user.create({
      data: { email, password: hash, role },
    });
  }

  async validatePassword(storedHash: string, plain: string) {
    return argon2.verify(storedHash, plain);
  }
  
  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (!user.password) throw new Error('Cannot change password for OAuth users');
    const ok = await argon2.verify(user.password, current);
    if (!ok) throw new Error('Mot de passe actuel incorrect');
    const hash = await argon2.hash(next);
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }

  async findOrCreateOAuthUser(params: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    provider: string;
    providerAccountId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }) {
    const { email, fullName, avatarUrl, provider, providerAccountId, accessToken, refreshToken, expiresAt } = params;

    // Chercher un compte existant pour ce provider
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingAccount) {
      // Mettre à jour les tokens si nécessaire
      await this.prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken,
          refreshToken,
          expiresAt,
        },
      });
      return existingAccount.user;
    }

    // Chercher un utilisateur existant avec cet email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Créer un nouvel utilisateur
      user = await this.prisma.user.create({
        data: {
          email,
          fullName,
          avatarUrl,
          role: 'PATIENT', // Par défaut, les utilisateurs OAuth sont des patients
        },
      });
    }

    // Créer le compte OAuth
    await this.prisma.account.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt,
      },
    });

    return user;
  }
}