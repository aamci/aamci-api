import { Test, TestingModule } from '@nestjs/testing';
import { FacilityManagersService } from './facility-managers.service';
import { PrismaService } from '../common/prisma.service';

describe('FacilityManagersService', () => {
  let service: FacilityManagersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    facilityManager: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityManagersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FacilityManagersService>(FacilityManagersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new facility manager', async () => {
      const createDto = {
        userId: 'user-123',
        facilityId: 'facility-123',
      };

      const mockResult = {
        id: 'manager-123',
        ...createDto,
        managedDoctorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.facilityManager.create.mockResolvedValue(mockResult);

      const result = await service.create(createDto);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.facilityManager.create).toHaveBeenCalledWith({
        data: {
          userId: createDto.userId,
          facilityId: createDto.facilityId,
          managedDoctorIds: [],
        },
        include: {
          user: true,
          facility: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a facility manager by userId', async () => {
      const userId = 'user-123';
      const mockResult = {
        id: 'manager-123',
        userId,
        facilityId: 'facility-123',
        managedDoctorIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: userId, email: 'test@example.com' },
        facility: { id: 'facility-123', name: 'Test Facility' },
      };

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockResult);

      const result = await service.findOne(userId);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.facilityManager.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: {
          user: true,
          facility: true,
        },
      });
    });

    it('should return null if facility manager not found', async () => {
      mockPrismaService.facilityManager.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent-user');

      expect(result).toBeNull();
    });
  });

  describe('getManagedDoctors', () => {
    it('should return all doctors managed by a facility manager', async () => {
      const userId = 'user-123';
      const mockManager = {
        id: 'manager-123',
        userId,
        facilityId: 'facility-123',
        managedDoctorIds: ['doctor-override-1'],
        facility: {
          doctors: [
            { userId: 'doctor-1' },
            { userId: 'doctor-2' },
          ],
        },
      };

      const mockDoctors = [
        {
          id: 'doctor-1',
          fullName: 'Dr. Smith',
          doctorProfile: { specialty: 'Cardiology' },
        },
        {
          id: 'doctor-2',
          fullName: 'Dr. Johnson',
          doctorProfile: { specialty: 'Neurology' },
        },
        {
          id: 'doctor-override-1',
          fullName: 'Dr. Override',
          doctorProfile: { specialty: 'Dermatology' },
        },
      ];

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockManager);
      mockPrismaService.user.findMany.mockResolvedValue(mockDoctors);

      const result = await service.getManagedDoctors(userId);

      expect(result).toEqual(mockDoctors);
      expect(result).toHaveLength(3);
    });

    it('should return empty array if manager not found', async () => {
      mockPrismaService.facilityManager.findUnique.mockResolvedValue(null);

      const result = await service.getManagedDoctors('nonexistent-user');

      expect(result).toEqual([]);
    });
  });

  describe('canManageDoctor', () => {
    it('should return true if manager can manage doctor from facility', async () => {
      const mockManager = {
        facilityId: 'facility-123',
        managedDoctorIds: [],
        facility: {
          doctors: [{ userId: 'doctor-1' }],
        },
      };

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockManager);

      const result = await service.canManageDoctor('manager-123', 'doctor-1');

      expect(result).toBe(true);
    });

    it('should return true if manager can manage doctor from override list', async () => {
      const mockManager = {
        facilityId: 'facility-123',
        managedDoctorIds: ['doctor-override'],
        facility: {
          doctors: [],
        },
      };

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockManager);

      const result = await service.canManageDoctor('manager-123', 'doctor-override');

      expect(result).toBe(true);
    });

    it('should return false if manager cannot manage doctor', async () => {
      const mockManager = {
        facilityId: 'facility-123',
        managedDoctorIds: [],
        facility: {
          doctors: [{ userId: 'doctor-1' }],
        },
      };

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockManager);

      const result = await service.canManageDoctor('manager-123', 'doctor-other');

      expect(result).toBe(false);
    });

    it('should return false if manager not found', async () => {
      mockPrismaService.facilityManager.findUnique.mockResolvedValue(null);

      const result = await service.canManageDoctor('nonexistent-manager', 'doctor-1');

      expect(result).toBe(false);
    });
  });

  describe('assignDoctor', () => {
    it('should add doctor to managedDoctorIds', async () => {
      const managerId = 'manager-123';
      const doctorId = 'doctor-new';
      const mockManager = {
        id: 'manager-123',
        userId: managerId,
        managedDoctorIds: ['doctor-1'],
      };

      const mockUpdated = {
        ...mockManager,
        managedDoctorIds: ['doctor-1', doctorId],
      };

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockManager);
      mockPrismaService.facilityManager.update.mockResolvedValue(mockUpdated);

      const result = await service.assignDoctor(managerId, doctorId);

      expect(result.managedDoctorIds).toContain(doctorId);
      expect(mockPrismaService.facilityManager.update).toHaveBeenCalled();
    });

    it('should not add duplicate doctor', async () => {
      const managerId = 'manager-123';
      const doctorId = 'doctor-1';
      const mockManager = {
        id: 'manager-123',
        userId: managerId,
        managedDoctorIds: ['doctor-1'],
      };

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockManager);
      mockPrismaService.facilityManager.update.mockResolvedValue(mockManager);

      const result = await service.assignDoctor(managerId, doctorId);

      expect(result.managedDoctorIds).toEqual(['doctor-1']);
    });
  });

  describe('removeDoctor', () => {
    it('should remove doctor from managedDoctorIds', async () => {
      const managerId = 'manager-123';
      const doctorId = 'doctor-1';
      const mockManager = {
        id: 'manager-123',
        userId: managerId,
        managedDoctorIds: ['doctor-1', 'doctor-2'],
      };

      const mockUpdated = {
        ...mockManager,
        managedDoctorIds: ['doctor-2'],
      };

      mockPrismaService.facilityManager.findUnique.mockResolvedValue(mockManager);
      mockPrismaService.facilityManager.update.mockResolvedValue(mockUpdated);

      const result = await service.removeDoctor(managerId, doctorId);

      expect(result.managedDoctorIds).not.toContain(doctorId);
      expect(result.managedDoctorIds).toContain('doctor-2');
    });
  });
});
