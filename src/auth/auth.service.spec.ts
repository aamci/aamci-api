import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../common/email.service';
import { PrismaService } from '../common/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    validatePassword: jest.fn(),
    findOrCreateOAuthUser: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // Re-initialize implementations reset by resetAllMocks
    mockJwtService.sign.mockReturnValue('mock-jwt-token');
    mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);
  });

  afterEach(() => jest.resetAllMocks());

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user and returns requiresVerification: true', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'patient@test.com',
        fullName: 'Jean Dupont',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.register('patient@test.com', 'secret123');

      expect(result.requiresVerification).toBe(true);
      expect(result.email).toBe('patient@test.com');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'patient@test.com',
        'secret123',
        'PATIENT',
        undefined,
      );
      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        'patient@test.com',
        expect.any(String),
        expect.any(String),
      );
    });

    it('accepts a custom role and fullName', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'doc-1',
        email: 'dr@clinic.com',
        fullName: 'Dr Martin',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.register('dr@clinic.com', 'pass', 'DOCTOR', 'Dr Martin');

      expect(result.requiresVerification).toBe(true);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'dr@clinic.com',
        'pass',
        'DOCTOR',
        'Dr Martin',
      );
    });

    it('throws ConflictException when email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(service.register('dup@test.com', 'pass')).rejects.toThrow(ConflictException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('does not throw if verification email fails to send', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ id: 'u1', email: 'x@x.com', fullName: null });
      mockPrismaService.user.update.mockResolvedValue({});
      mockEmailService.sendVerificationEmail.mockRejectedValue(new Error('SMTP error'));

      // Should still return success, not re-throw
      await expect(service.register('x@x.com', 'pass')).resolves.toMatchObject({
        requiresVerification: true,
      });
    });
  });

  // ─── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    const verifiedUser = {
      id: 'user-1',
      email: 'patient@test.com',
      password: '$argon2id$...',
      emailVerified: true,
      role: 'PATIENT',
    };

    it('returns access_token for valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(verifiedUser);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.login('patient@test.com', 'secret123');

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'patient@test.com', role: 'PATIENT' },
        expect.objectContaining({ expiresIn: '7d' }),
      );
    });

    it('throws UnauthorizedException for unknown user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('ghost@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(verifiedUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(service.login('patient@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when email is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...verifiedUser, emailVerified: false });
      mockUsersService.validatePassword.mockResolvedValue(true);

      await expect(service.login('patient@test.com', 'secret123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for OAuth user without password', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...verifiedUser, password: null });

      await expect(service.login('oauth@test.com', 'pass')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── verifyEmail ─────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('marks email as verified and returns access_token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'PATIENT',
        tokenExpiry: new Date(Date.now() + 3_600_000), // 1h future
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.verifyEmail('valid-token-abc');

      expect(result).toHaveProperty('access_token');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: true, verificationToken: null, tokenExpiry: null },
      });
    });

    it('throws BadRequestException for unknown token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        tokenExpiry: new Date(Date.now() - 1000), // past
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── resendVerificationEmail ──────────────────────────────────────────────────

  describe('resendVerificationEmail', () => {
    it('sends a new verification email', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        emailVerified: false,
        fullName: 'Jean',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.resendVerificationEmail('test@test.com');

      expect(result.email).toBe('test@test.com');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@test.com',
        expect.any(String),
        'Jean',
      );
    });

    it('throws BadRequestException if email not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.resendVerificationEmail('nobody@test.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if email already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'u1',
        email: 'already@test.com',
        emailVerified: true,
      });

      await expect(service.resendVerificationEmail('already@test.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
