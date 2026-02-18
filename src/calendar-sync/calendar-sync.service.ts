import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateCalendarConnectionDto,
  UpdateCalendarConnectionDto,
  RefreshTokenDto,
  CalendarProvider,
} from './dto/create-calendar-connection.dto';
import * as crypto from 'crypto';

@Injectable()
export class CalendarSyncService {
  constructor(private prisma: PrismaService) {}

  async getConnections(userId: string) {
    return this.prisma.calendarConnection.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        isActive: true,
        syncDirection: true,
        showBusyOnly: true,
        autoSync: true,
        syncIntervalMins: true,
        selectedCalendars: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        createdAt: true,
      },
    });
  }

  async getConnection(userId: string, provider: CalendarProvider) {
    const connection = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: { userId, provider },
      },
    });

    if (!connection) {
      throw new NotFoundException('Calendar connection not found');
    }

    return connection;
  }

  async createConnection(userId: string, createDto: CreateCalendarConnectionDto) {
    // Check if connection already exists
    const existing = await this.prisma.calendarConnection.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: createDto.provider,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A connection for this provider already exists');
    }

    return this.prisma.calendarConnection.create({
      data: {
        userId,
        provider: createDto.provider,
        providerAccountId: createDto.providerAccountId,
        providerEmail: createDto.providerEmail,
        accessToken: createDto.accessToken,
        refreshToken: createDto.refreshToken,
        tokenExpiresAt: createDto.tokenExpiresAt,
        isActive: true,
        syncDirection: 'BOTH',
        autoSync: true,
        syncIntervalMins: 15,
        selectedCalendars: [],
      },
    });
  }

  async updateConnection(
    userId: string,
    provider: CalendarProvider,
    updateDto: UpdateCalendarConnectionDto,
  ) {
    await this.getConnection(userId, provider);

    return this.prisma.calendarConnection.update({
      where: {
        userId_provider: { userId, provider },
      },
      data: updateDto,
    });
  }

  async refreshTokens(
    userId: string,
    provider: CalendarProvider,
    tokens: RefreshTokenDto,
  ) {
    await this.getConnection(userId, provider);

    return this.prisma.calendarConnection.update({
      where: {
        userId_provider: { userId, provider },
      },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        tokenExpiresAt: tokens.tokenExpiresAt,
      },
    });
  }

  async disconnect(userId: string, provider: CalendarProvider) {
    await this.getConnection(userId, provider);

    await this.prisma.calendarConnection.delete({
      where: {
        userId_provider: { userId, provider },
      },
    });

    return { message: 'Calendar disconnected successfully' };
  }

  async syncCalendar(userId: string, provider: CalendarProvider) {
    const connection = await this.getConnection(userId, provider);

    if (!connection.isActive) {
      throw new BadRequestException('Calendar connection is not active');
    }

    try {
      // TODO: Implement actual calendar sync based on provider
      // This would involve:
      // 1. Fetching events from external calendar
      // 2. Creating/updating local availability slots
      // 3. Exporting local appointments to external calendar

      await this.prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          errorMessage: null,
        },
      });

      return { message: 'Calendar synced successfully', lastSyncAt: new Date() };
    } catch (error) {
      await this.prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'FAILED',
          errorMessage: error.message,
        },
      });

      throw new BadRequestException(`Sync failed: ${error.message}`);
    }
  }

  async syncAllCalendars(userId: string) {
    const connections = await this.prisma.calendarConnection.findMany({
      where: {
        userId,
        isActive: true,
        autoSync: true,
      },
    });

    const results: { provider: string; status: string; error?: string }[] = [];

    for (const connection of connections) {
      try {
        await this.syncCalendar(userId, connection.provider as CalendarProvider);
        results.push({ provider: connection.provider, status: 'SUCCESS' });
      } catch (error) {
        results.push({
          provider: connection.provider,
          status: 'FAILED',
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  // Generate iCal URL for read-only access
  async getICalUrl(userId: string) {
    // Generate a unique token for this user's iCal feed
    const token = crypto.createHash('sha256').update(`${userId}-ical-feed`).digest('hex').slice(0, 32);

    return {
      url: `/calendar/ical/${token}`,
      token,
    };
  }

  // Get iCal feed content
  async getICalFeed(token: string) {
    // Find the user by checking all users' token hashes
    const users = await this.prisma.user.findMany({ select: { id: true } });
    let matchedUserId: string | null = null;
    for (const user of users) {
      const hash = crypto.createHash('sha256').update(`${user.id}-ical-feed`).digest('hex').slice(0, 32);
      if (hash === token) {
        matchedUserId = user.id;
        break;
      }
    }

    if (!matchedUserId) {
      throw new NotFoundException('Invalid iCal token');
    }

    // Fetch upcoming appointments for this user
    const appointments = await this.prisma.appointment.findMany({
      where: {
        OR: [
          { patientId: matchedUserId },
          { slot: { ownerId: matchedUserId } },
        ],
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      include: {
        slot: true,
        patient: { select: { fullName: true } },
        kind: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const events = appointments.map((apt) => {
      const start = apt.slot?.start ? new Date(apt.slot.start) : new Date(apt.createdAt);
      const end = apt.slot?.end ? new Date(apt.slot.end) : new Date(start.getTime() + 30 * 60000);
      const summary = apt.kind?.name || apt.notes || 'Rendez-vous';
      const description = `Patient: ${apt.patient?.fullName || 'N/A'}`;

      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

      return `BEGIN:VEVENT
DTSTART:${fmt(start)}
DTEND:${fmt(end)}
SUMMARY:${summary}
DESCRIPTION:${description}
UID:${apt.id}@healthplatform
STATUS:${apt.status === 'CONFIRMED' ? 'CONFIRMED' : 'TENTATIVE'}
END:VEVENT`;
    }).join('\n');

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HealthPlatform//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Mes Rendez-vous
${events}
END:VCALENDAR`;
  }

  // Get sync settings
  async getSyncSettings(userId: string) {
    const connections = await this.getConnections(userId);

    return {
      connections: connections.map((c) => ({
        provider: c.provider,
        isActive: c.isActive,
        syncDirection: c.syncDirection,
        showBusyOnly: c.showBusyOnly,
        autoSync: c.autoSync,
        syncIntervalMins: c.syncIntervalMins,
        lastSyncAt: c.lastSyncAt,
      })),
      icalUrl: await this.getICalUrl(userId),
    };
  }

  async updateSyncSettings(
    userId: string,
    provider: CalendarProvider,
    settings: Partial<UpdateCalendarConnectionDto>,
  ) {
    return this.updateConnection(userId, provider, settings);
  }
}
