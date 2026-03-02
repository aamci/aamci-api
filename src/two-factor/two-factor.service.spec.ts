import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../common/prisma.service';

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  const mockPrismaService = {
    twoFactorAuth: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── generateSecret ───────────────────────────────────────────────────────────

  describe('generateSecret', () => {
    it('returns secret, otpauthUrl, and backupCodes for valid user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'doc@clinic.com',
      });
      mockPrismaService.twoFactorAuth.upsert.mockResolvedValue({});

      const result = await service.generateSecret('user-1');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpauthUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(Array.isArray(result.backupCodes)).toBe(true);
      expect(result.backupCodes).toHaveLength(10);
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain('clinic.com');
    });

    it('throws BadRequestException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.generateSecret('ghost-id')).rejects.toThrow(BadRequestException);
    });

    it('stores hashed backup codes (not plaintext)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      let capturedData: any;
      mockPrismaService.twoFactorAuth.upsert.mockImplementation(({ create }) => {
        capturedData = create;
        return {};
      });

      const { backupCodes } = await service.generateSecret('u1');

      // Stored codes should not match plaintext
      for (const code of backupCodes) {
        expect(capturedData.backupCodes).not.toContain(code);
      }
    });
  });

  // ─── enable ───────────────────────────────────────────────────────────────────

  describe('enable', () => {
    it('enables 2FA when TOTP code is valid', async () => {
      const record = { userId: 'u1', secret: 'c2VjcmV0', isEnabled: false };
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue(record);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({ ...record, isEnabled: true });

      // Spy on private verifyTOTP to return true
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(true);

      const result = await service.enable('u1', '123456');

      expect(result.message).toContain('enabled');
      expect(mockPrismaService.twoFactorAuth.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { isEnabled: true },
      });
    });

    it('throws BadRequestException for invalid TOTP code', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'u1',
        secret: 'c2VjcmV0',
        isEnabled: false,
      });
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);

      await expect(service.enable('u1', '999999')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when 2FA not set up', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue(null);

      await expect(service.enable('u1', '123456')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when 2FA already enabled', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'u1',
        secret: 'c2VjcmV0',
        isEnabled: true,
      });

      await expect(service.enable('u1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── disable ──────────────────────────────────────────────────────────────────

  describe('disable', () => {
    it('disables 2FA when TOTP code is valid', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'u1',
        secret: 'c2VjcmV0',
        isEnabled: true,
      });
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(true);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});

      const result = await service.disable('u1', '123456');

      expect(result.message).toContain('disabled');
      expect(mockPrismaService.twoFactorAuth.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { isEnabled: false, secret: null, backupCodes: [] },
      });
    });

    it('throws BadRequestException when 2FA is not enabled', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({ isEnabled: false });

      await expect(service.disable('u1', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── verify ───────────────────────────────────────────────────────────────────

  describe('verify', () => {
    it('returns true when 2FA is not enabled', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue(null);

      expect(await service.verify('u1', '000000')).toBe(true);
    });

    it('returns true for valid TOTP code', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'u1',
        secret: 'c2VjcmV0',
        isEnabled: true,
        lockedUntil: null,
        backupCodes: [],
        failedAttempts: 0,
      });
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(true);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});

      expect(await service.verify('u1', '123456')).toBe(true);
    });

    it('returns false and increments failedAttempts for bad code', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'u1',
        secret: 'c2VjcmV0',
        isEnabled: true,
        lockedUntil: null,
        backupCodes: [],
        failedAttempts: 0,
      });
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});

      const result = await service.verify('u1', 'bad-code');

      expect(result).toBe(false);
      expect(mockPrismaService.twoFactorAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedAttempts: 1 }),
        }),
      );
    });

    it('throws UnauthorizedException when account is locked', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        isEnabled: true,
        secret: 'c2VjcmV0',
        lockedUntil: new Date(Date.now() + 900_000), // 15 min in future
        backupCodes: [],
        failedAttempts: 5,
      });

      await expect(service.verify('u1', '123456')).rejects.toThrow(UnauthorizedException);
    });

    it('accepts a valid backup code', async () => {
      const crypto = require('crypto');
      const plainCode = 'ABCD-1234';
      const hashedCode = crypto.createHash('sha256').update(plainCode).digest('hex');

      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'u1',
        secret: 'c2VjcmV0',
        isEnabled: true,
        lockedUntil: null,
        backupCodes: [hashedCode],
        failedAttempts: 0,
      });
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false); // TOTP fails
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});

      const result = await service.verify('u1', plainCode);

      expect(result).toBe(true);
      // Backup code should be removed after use
      expect(mockPrismaService.twoFactorAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ backupCodes: [] }), // code removed
        }),
      );
    });

    it('locks account after 5 failed attempts', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        userId: 'u1',
        secret: 'c2VjcmV0',
        isEnabled: true,
        lockedUntil: null,
        backupCodes: [],
        failedAttempts: 4, // one more will trigger lock
      });
      jest.spyOn(service as any, 'verifyTOTP').mockReturnValue(false);
      mockPrismaService.twoFactorAuth.update.mockResolvedValue({});

      await service.verify('u1', 'bad');

      expect(mockPrismaService.twoFactorAuth.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ─── getStatus ────────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns isEnabled: false when no 2FA record exists', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue(null);

      const status = await service.getStatus('u1');

      expect(status.isEnabled).toBe(false);
      expect(status.backupCodesRemaining).toBe(0);
    });

    it('returns correct status for enabled 2FA', async () => {
      mockPrismaService.twoFactorAuth.findUnique.mockResolvedValue({
        isEnabled: true,
        lastUsedAt: new Date(),
        phoneVerified: false,
        recoveryEmailVerified: false,
        backupCodes: ['code1', 'code2', 'code3'],
      });

      const status = await service.getStatus('u1');

      expect(status.isEnabled).toBe(true);
      expect(status.backupCodesRemaining).toBe(3);
    });
  });
});
