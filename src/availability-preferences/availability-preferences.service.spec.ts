import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityPreferencesService } from './availability-preferences.service';
import { PrismaService } from '../common/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('AvailabilityPreferencesService', () => {
  let service: AvailabilityPreferencesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    availabilityPreference: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    availabilityRule: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityPreferencesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AvailabilityPreferencesService>(AvailabilityPreferencesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Semaine standard',
      description: 'Horaires de base',
      isDefault: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 18,
      slotDurationMins: 30,
      capacity: 1,
      allowedKindIds: [],
      excludedTimes: ['12:00-14:00'],
      minBookingNotice: 24,
      maxBookingAdvance: 90,
      autoConfirm: true,
      allowCancellation: true,
      cancellationDeadline: 24,
    };

    it('should create a new preference', async () => {
      const userId = 'user-123';
      const ownerType = 'DOCTOR';

      mockPrismaService.availabilityPreference.count.mockResolvedValue(2);
      mockPrismaService.availabilityPreference.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.availabilityPreference.create.mockResolvedValue({
        id: 'pref-new',
        ownerId: userId,
        ownerType,
        ...createDto,
      });

      const result = await service.create(userId, ownerType, createDto);

      expect(result.ownerId).toBe(userId);
      expect(result.ownerType).toBe(ownerType);
      expect(mockPrismaService.availabilityPreference.create).toHaveBeenCalled();
    });

    it('should throw error if max preferences limit reached', async () => {
      mockPrismaService.availabilityPreference.count.mockResolvedValue(3);

      await expect(
        service.create('user-123', 'DOCTOR', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unset other default preferences if isDefault is true', async () => {
      const userId = 'user-123';
      mockPrismaService.availabilityPreference.count.mockResolvedValue(1);
      mockPrismaService.availabilityPreference.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.availabilityPreference.create.mockResolvedValue({
        id: 'pref-new',
        ...createDto,
      });

      await service.create(userId, 'DOCTOR', createDto);

      expect(mockPrismaService.availabilityPreference.updateMany).toHaveBeenCalledWith({
        where: { ownerId: userId, ownerType: 'DOCTOR', isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('findAll', () => {
    it('should return all preferences for a user', async () => {
      const userId = 'user-123';
      const mockPreferences = [
        { id: 'pref-1', name: 'Pref 1', ownerId: userId },
        { id: 'pref-2', name: 'Pref 2', ownerId: userId },
      ];

      mockPrismaService.availabilityPreference.findMany.mockResolvedValue(mockPreferences);

      const result = await service.findAll(userId);

      expect(result).toEqual(mockPreferences);
      expect(mockPrismaService.availabilityPreference.findMany).toHaveBeenCalledWith({
        where: { ownerId: userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  describe('setDefault', () => {
    it('should set a preference as default and unset others', async () => {
      const preferenceId = 'pref-1';
      const userId = 'user-123';

      const mockPreference = {
        id: preferenceId,
        ownerId: userId,
        isDefault: false,
      };

      const mockOtherPreferences = [
        { id: 'pref-2', isDefault: true },
      ];

      mockPrismaService.availabilityPreference.findFirst.mockResolvedValue(mockPreference);
      mockPrismaService.availabilityPreference.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.availabilityPreference.update.mockResolvedValue({
        ...mockPreference,
        isDefault: true,
      });

      const result = await service.setDefault(preferenceId, userId);

      expect(result.isDefault).toBe(true);
      expect(mockPrismaService.availabilityPreference.updateMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.availabilityPreference.update).toHaveBeenCalledTimes(1);
    });

    it('should throw error if preference not found', async () => {
      mockPrismaService.availabilityPreference.findFirst.mockResolvedValue(null);

      await expect(
        service.setDefault('nonexistent', 'user-123'),
      ).rejects.toThrow('Preference not found');
    });
  });

  describe('applyPreference', () => {
    it('should create an availability rule from a preference', async () => {
      const preferenceId = 'pref-1';
      const userId = 'user-123';
      const applyDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const mockPreference = {
        id: preferenceId,
        ownerId: userId,
        ownerType: 'DOCTOR',
        daysOfWeek: [1, 2, 3, 4, 5],
        startHour: 9,
        endHour: 18,
        slotDurationMins: 30,
        capacity: 1,
        allowedKindIds: [],
        excludedTimes: [],
        minBookingNotice: 24,
        maxBookingAdvance: 90,
        autoConfirm: true,
        allowCancellation: true,
        cancellationDeadline: 24,
      };

      const mockRule = {
        id: 'rule-1',
        ...mockPreference,
        ...applyDto,
        ownerId: userId,
        ownerType: 'DOCTOR',
      };

      mockPrismaService.availabilityPreference.findFirst.mockResolvedValue(mockPreference);
      mockPrismaService.availabilityRule.create.mockResolvedValue(mockRule);

      const result = await service.applyPreference(preferenceId, userId, applyDto);

      expect(result).toEqual(mockRule);
      expect(mockPrismaService.availabilityRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: userId,
          ownerType: 'DOCTOR',
          startDate: new Date(applyDto.startDate),
          endDate: new Date(applyDto.endDate),
          daysOfWeek: mockPreference.daysOfWeek,
        }),
      });
    });

    it('should throw error if preference not found', async () => {
      mockPrismaService.availabilityPreference.findFirst.mockResolvedValue(null);

      await expect(
        service.applyPreference('nonexistent', 'user-123', {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
      ).rejects.toThrow('Preference not found');
    });
  });

  describe('delete', () => {
    it('should delete a preference', async () => {
      const preferenceId = 'pref-1';
      const userId = 'user-123';

      const mockPreference = {
        id: preferenceId,
        ownerId: userId,
      };

      mockPrismaService.availabilityPreference.findFirst.mockResolvedValue(mockPreference);
      mockPrismaService.availabilityPreference.delete.mockResolvedValue(mockPreference);

      const result = await service.remove(preferenceId, userId);

      expect(result).toEqual(mockPreference);
      expect(mockPrismaService.availabilityPreference.delete).toHaveBeenCalledWith({
        where: { id: preferenceId },
      });
    });

    it('should throw error if preference not found', async () => {
      mockPrismaService.availabilityPreference.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', 'user-123'),
      ).rejects.toThrow('Preference not found');
    });

    it('should throw error if preference not found for this user', async () => {
      // findFirst with { id, ownerId } returns null when ownerId doesn't match
      mockPrismaService.availabilityPreference.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('pref-1', 'user-123'),
      ).rejects.toThrow('Preference not found');
    });
  });
});
