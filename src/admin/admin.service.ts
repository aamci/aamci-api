import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { getEncryptionCoverage } from '../common/prisma-encryption.extension';
import * as argon2 from 'argon2';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Users ───────────────────────────────────────────────────────────────

  async getUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          phone: true,
          city: true,
          createdAt: true,
          updatedAt: true,
        } as any,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        phone: true,
        city: true,
        sex: true,
        birthdate: true,
        createdAt: true,
        updatedAt: true,
        doctorProfile: {
          select: { specialty: true, city: true, presentation: true },
        },
        _count: {
          select: { appointments: true },
        },
      } as any,
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async updateUser(
    id: string,
    dto: { role?: string; fullName?: string; isActive?: boolean },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return this.prisma.user.update({
      where: { id },
      data: dto as any,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      } as any,
    });
  }

  async suspendUser(id: string) {
    return this.updateUser(id, { isActive: false });
  }

  async activateUser(id: string) {
    return this.updateUser(id, { isActive: true });
  }

  async createUser(dto: {
    email: string;
    password: string;
    role: string;
    fullName?: string;
    adminId?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const hash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        role: dto.role as any,
        fullName: dto.fullName ?? null,
        emailVerified: true,
        isActive: true,
      } as any,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      } as any,
    });
    if (dto.adminId) await this.logAudit(dto.adminId, 'CREATE_USER', (user as any).id, 'USER', { role: dto.role, email: dto.email });
    return user;
  }

  // ─── Appointments ─────────────────────────────────────────────────────────

  async getAppointments(params: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          notes: true,
          patient: {
            select: { id: true, fullName: true, email: true },
          },
          slot: {
            select: { start: true, end: true, ownerId: true },
          },
          kind: {
            select: { name: true, durationMins: true },
          },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return { appointments, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getAppointmentById(id: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, email: true, phone: true } },
        slot: { include: { appointments: false } },
        kind: true,
        history: { orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { id: true, fullName: true, role: true } } } },
        transactions: { select: { id: true, amount: true, type: true, status: true, provider: true, createdAt: true } },
      },
    });
    if (!appt) throw new NotFoundException('Rendez-vous non trouvé');
    return appt;
  }

  async cancelAppointment(id: string, adminId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Rendez-vous non trouvé');
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await this.logAudit(adminId, 'CANCEL_APPOINTMENT', id, 'APPOINTMENT', { previousStatus: appt.status });
    return updated;
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  async getTransactions(params: { page?: number; limit?: number; type?: string; status?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          type: true,
          status: true,
          provider: true,
          providerRef: true,
          description: true,
          createdAt: true,
          doctor: { select: { id: true, fullName: true, email: true } },
          patient: { select: { id: true, fullName: true, email: true } },
          appointmentId: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalAmount = await this.prisma.transaction.aggregate({
      where: { ...where, status: 'SUCCESS' },
      _sum: { amount: true },
    });

    return { transactions, total, page, limit, pages: Math.ceil(total / limit), totalAmount: totalAmount._sum.amount ?? 0 };
  }

  // ─── Doctors ──────────────────────────────────────────────────────────────

  async getDoctors(params: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { role: 'DOCTOR' };
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [doctors, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          createdAt: true,
          doctorProfile: { select: { specialty: true, city: true, averageRating: true, totalReviews: true } },
          _count: { select: { appointments: true } },
        } as any,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { doctors, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Facilities ───────────────────────────────────────────────────────────

  async getFacilities(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [facilities, total] = await Promise.all([
      this.prisma.facility.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { doctors: true, managers: true } },
        },
      }),
      this.prisma.facility.count({ where }),
    ]);

    return { facilities, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Audit logs ───────────────────────────────────────────────────────────

  async getAuditLogs(params: { page?: number; limit?: number; adminId?: string; action?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 30));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.adminId) where.adminId = params.adminId;
    if (params.action) where.action = params.action;

    const [logs, total] = await Promise.all([
      (this.prisma as any).adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      (this.prisma as any).adminAuditLog.count({ where }),
    ]);

    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  private async logAudit(adminId: string, action: string, targetId?: string, targetType?: string, metadata?: any) {
    try {
      await (this.prisma as any).adminAuditLog.create({
        data: { adminId, action, targetId, targetType, metadata },
      });
    } catch {
      // Don't fail the main operation if audit logging fails
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  private readonly DEFAULT_SETTINGS = [
    { key: 'platform_name', value: 'Health Platform', label: 'Nom de la plateforme' },
    { key: 'maintenance_mode', value: 'false', label: 'Mode maintenance' },
    { key: 'max_appointments_per_day', value: '50', label: 'Max RDV par jour' },
    { key: 'support_email', value: 'support@health.local', label: 'Email support' },
    { key: 'allow_registration', value: 'true', label: 'Autoriser les inscriptions' },
  ];

  async getSettings() {
    const existing = await (this.prisma as any).platformSetting.findMany();
    const map = new Map(existing.map((s: any) => [s.key, s]));

    // Seed defaults if missing
    for (const def of this.DEFAULT_SETTINGS) {
      if (!map.has(def.key)) {
        await (this.prisma as any).platformSetting.upsert({
          where: { key: def.key },
          create: def,
          update: {},
        });
        map.set(def.key, def);
      }
    }

    return (this.prisma as any).platformSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async updateSetting(key: string, value: string, adminId: string) {
    const setting = await (this.prisma as any).platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await this.logAudit(adminId, 'UPDATE_SETTING', key, 'SETTING', { value });
    return setting;
  }

  // ─── Daily stats for charts ───────────────────────────────────────────────

  async getDailyStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [appointments, users] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, status: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, role: true } as any,
      }),
    ]);

    // Group by date
    const dateMap: Record<string, { date: string; appointments: number; users: number; completed: number; cancelled: number }> = {};

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dateMap[key] = { date: key, appointments: 0, users: 0, completed: 0, cancelled: 0 };
    }

    for (const a of appointments) {
      const key = a.createdAt.toISOString().slice(0, 10);
      if (dateMap[key]) {
        dateMap[key].appointments++;
        if (a.status === 'COMPLETED') dateMap[key].completed++;
        if (a.status === 'CANCELLED') dateMap[key].cancelled++;
      }
    }

    for (const u of users) {
      const key = (u as any).createdAt.toISOString().slice(0, 10);
      if (dateMap[key]) dateMap[key].users++;
    }

    return Object.values(dateMap);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async getAdminStats() {
    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      cancelledAppointments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'DOCTOR' } as any }),
      this.prisma.user.count({ where: { role: 'PATIENT' } as any }),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({ where: { status: 'PENDING' } }),
      this.prisma.appointment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.appointment.count({ where: { status: 'CANCELLED' } }),
    ]);

    return {
      users: { total: totalUsers, doctors: totalDoctors, patients: totalPatients },
      appointments: {
        total: totalAppointments,
        pending: pendingAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
      },
    };
  }

  // ─── Encryption status ────────────────────────────────────────────────────

  getEncryptionStatus() {
    const keyPresent = !!process.env.ENCRYPTION_KEY;
    const coverage = getEncryptionCoverage();

    return {
      active: keyPresent,
      algorithm: 'AES-256-GCM',
      keyPresent,
      modelsProtected: Object.keys(coverage),
      coverage,
      warning: keyPresent
        ? null
        : 'ENCRYPTION_KEY manquante — les données ne sont pas chiffrées',
    };
  }
}
