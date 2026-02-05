import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  constructor(private prisma: PrismaService) {}

  async generateSecret(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = crypto.randomBytes(20).toString('base64');
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map((code) =>
      crypto.createHash('sha256').update(code).digest('hex'),
    );

    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret,
        backupCodes: hashedBackupCodes,
        isEnabled: false,
      },
      update: {
        secret,
        backupCodes: hashedBackupCodes,
        isEnabled: false,
      },
    });

    const issuer = 'HealthPlatform';
    const base32Secret = this.base32Encode(secret);
    const otpauthUrl = `otpauth://totp/${issuer}:${user.email}?secret=${base32Secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return {
      secret: base32Secret,
      otpauthUrl,
      backupCodes,
    };
  }

  async enable(userId: string, code: string) {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.secret) {
      throw new BadRequestException('2FA not set up. Generate secret first.');
    }

    if (twoFactor.isEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const isValid = this.verifyTOTP(twoFactor.secret, code);

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true },
    });

    return { message: '2FA enabled successfully' };
  }

  async disable(userId: string, code: string) {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.isEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = this.verifyTOTP(twoFactor.secret!, code);

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isEnabled: false,
        secret: null,
        backupCodes: [],
      },
    });

    return { message: '2FA disabled successfully' };
  }

  async verify(userId: string, code: string): Promise<boolean> {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.isEnabled || !twoFactor.secret) {
      return true;
    }

    if (twoFactor.lockedUntil && twoFactor.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked due to too many failed attempts',
      );
    }

    const isValidTOTP = this.verifyTOTP(twoFactor.secret, code);

    if (isValidTOTP) {
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          lastUsedAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      return true;
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const backupCodeIndex = twoFactor.backupCodes.indexOf(hashedCode);

    if (backupCodeIndex !== -1) {
      const updatedCodes = [...twoFactor.backupCodes];
      updatedCodes.splice(backupCodeIndex, 1);

      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: updatedCodes,
          lastUsedAt: new Date(),
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      return true;
    }

    const newFailedAttempts = twoFactor.failedAttempts + 1;
    const lockUntil =
      newFailedAttempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        failedAttempts: newFailedAttempts,
        lockedUntil: lockUntil,
      },
    });

    return false;
  }

  async isEnabled(userId: string): Promise<boolean> {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });

    return twoFactor?.isEnabled ?? false;
  }

  async getStatus(userId: string) {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: {
        isEnabled: true,
        lastUsedAt: true,
        phoneVerified: true,
        recoveryEmailVerified: true,
        backupCodes: true,
      },
    });

    if (!twoFactor) {
      return {
        isEnabled: false,
        lastUsedAt: null,
        phoneVerified: false,
        recoveryEmailVerified: false,
        backupCodesRemaining: 0,
      };
    }

    return {
      isEnabled: twoFactor.isEnabled,
      lastUsedAt: twoFactor.lastUsedAt,
      phoneVerified: twoFactor.phoneVerified,
      recoveryEmailVerified: twoFactor.recoveryEmailVerified,
      backupCodesRemaining: twoFactor.backupCodes.length,
    };
  }

  async regenerateBackupCodes(userId: string, code: string) {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor || !twoFactor.isEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = this.verifyTOTP(twoFactor.secret!, code);

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map((c) =>
      crypto.createHash('sha256').update(c).digest('hex'),
    );

    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: hashedBackupCodes },
    });

    return { backupCodes };
  }

  private verifyTOTP(secret: string, code: string, window = 1): boolean {
    const now = Math.floor(Date.now() / 1000);
    const timeStep = 30;

    for (let i = -window; i <= window; i++) {
      const counter = Math.floor((now + i * timeStep) / timeStep);
      const expectedCode = this.generateTOTP(secret, counter);

      if (expectedCode === code) {
        return true;
      }
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

    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  private generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.slice(0, 4) + '-' + code.slice(4));
    }
    return codes;
  }

  private base32Encode(input: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const buffer = Buffer.from(input, 'base64');
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }
}
