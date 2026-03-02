import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'APPOINTMENT_REMINDER',
    title: 'Rappel RDV',
    message: 'Votre RDV est demain à 10h.',
    read: false,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEmailService = {
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockGateway = {
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('calls prisma.notification.create with correct data', async () => {
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.create({
        userId: 'user-1',
        type: 'APPOINTMENT_REMINDER',
        title: 'Rappel RDV',
        message: 'Votre RDV est demain.',
      });

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'APPOINTMENT_REMINDER',
            title: 'Rappel RDV',
          }),
        }),
      );
    });

    it('sets sentViaEmail and emailSentAt when sendEmail is true', async () => {
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.create({
        userId: 'user-1',
        type: 'NEW_MESSAGE',
        title: 'Nouveau message',
        message: 'Dr Martin vous a écrit.',
        sendEmail: true,
      });

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sentViaEmail: true,
            emailSentAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ─── findAllByUser ────────────────────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('returns all notifications for a user', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.findAllByUser('user-1');

      expect(result).toEqual([mockNotification]);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('filters to unread only when unreadOnly=true', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findAllByUser('user-1', true);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', read: false },
        }),
      );
    });
  });

  // ─── getUnreadCount ───────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('counts unread notifications for a user', async () => {
      mockPrismaService.notification.count.mockResolvedValue(3);

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(3);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
    });
  });

  // ─── markAsRead ───────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('updates notification to read when owner calls it', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({ ...mockNotification, read: true });

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.read).toBe(true);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ read: true }),
      });
    });

    it('throws when notification not found or does not belong to user', async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('notif-1', 'other-user')).rejects.toThrow();
    });
  });

  // ─── markAllAsRead ────────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for a user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: expect.objectContaining({ read: true }),
      });
    });
  });
});
