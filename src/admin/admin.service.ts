import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { getEncryptionCoverage } from '../common/prisma-encryption.extension';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

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
          select: {
            specialty: true,
            city: true,
            presentation: true,
            hospitalType: true,
            address: true,
            formations: true,
            experiences: true,
            averageRating: true,
            totalReviews: true,
            autoConfirmPatientBookings: true,
            facilities: { select: { id: true, name: true, type: true, city: true } },
          },
        },
        patientProfile: {
          select: {
            civility: true,
            firstName: true,
            birthLastName: true,
            usageLastName: true,
            birthDate: true,
            birthPlace: true,
            birthCountry: true,
            phonePrimary: true,
            phoneSecondary: true,
            addressLine1: true,
            postalCode: true,
            city: true,
            country: true,
            insuranceProvider: true,
            mutualInsurance: true,
            bloodGroup: true,
            heightCm: true,
            weightKg: true,
            primaryDoctorName: true,
            patientCode: true,
          },
        },
        _count: {
          select: { appointments: true },
        },
      } as any,
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    // Fetch contracts linked to this user
    let contracts: any[] = [];
    try {
      contracts = await (this.prisma as any).contract.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          entityName: true,
          startDate: true,
          endDate: true,
          value: true,
          currency: true,
          signedAt: true,
          createdAt: true,
        },
      });
    } catch {
      // Contract model may not be available (migration pending)
      contracts = [];
    }

    return { ...user, contracts };
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

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    await this.prisma.user.update({
      where: { id },
      data: {
        email: `supprime_${id}@supprime.ga`,
        fullName: 'Compte supprimé',
        phone: null,
        city: null,
        birthdate: null,
        avatarUrl: null,
        password: null,
        isActive: false,
      },
    });
    await this.prisma.account.deleteMany({ where: { userId: id } });
    return { message: 'Utilisateur anonymisé avec succès' };
  }

  async resetUserPassword(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    // Generate a secure 12-character temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    const tempPassword = Array.from(crypto.randomBytes(12))
      .map((b) => chars[b % chars.length])
      .join('');

    const hash = await argon2.hash(tempPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hash } as any,
    });

    // Send the temp password by email
    try {
      await this.emailService.sendAdminPasswordReset(
        user.email,
        user.fullName ?? user.email,
        tempPassword,
      );
    } catch (err) {
      // Don't fail if email fails — log and continue
      console.error('Failed to send admin password reset email:', err);
    }

    await this.logAudit(adminId, 'RESET_PASSWORD', id, 'USER', { email: user.email });
    return { success: true, message: 'Mot de passe temporaire envoyé par email.' };
  }

  async verifyUserEmail(id: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, emailVerified: true } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (user.emailVerified) return { success: true, message: 'Email déjà vérifié.' };

    await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true, verificationToken: null, tokenExpiry: null } as any,
    });
    await this.logAudit(adminId, 'VERIFY_EMAIL', id, 'USER', { email: user.email });
    return { success: true, message: 'Email vérifié manuellement.' };
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

  async getFacilityById(id: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: {
        doctors: {
          select: {
            userId: true,
            specialty: true,
            city: true,
            averageRating: true,
            totalReviews: true,
            user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true, avatarUrl: true } },
          },
        },
        managers: {
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true } },
          },
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, type: true, status: true, startDate: true, endDate: true, value: true, currency: true, signedAt: true },
        },
        _count: { select: { doctors: true, managers: true } },
      },
    });
    if (!facility) throw new NotFoundException('Établissement non trouvé');
    return facility;
  }

  async getDoctorById(id: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id, role: 'DOCTOR' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        city: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        doctorProfile: {
          include: {
            facilities: { select: { id: true, name: true, type: true, city: true } },
            reviews: { select: { id: true, overallRating: true, comment: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
        _count: { select: { appointments: true } } as any,
      } as any,
    });
    if (!doctor) throw new NotFoundException('Médecin introuvable');
    return doctor;
  }

  async createFacility(data: {
    name: string;
    type: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
  }) {
    return this.prisma.facility.create({ data: data as any });
  }

  async updateFacility(id: string, data: {
    name?: string;
    type?: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
  }) {
    return this.prisma.facility.update({ where: { id }, data: data as any });
  }

  async deleteFacility(id: string) {
    return this.prisma.facility.delete({ where: { id } });
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

  // ─── Contracts ────────────────────────────────────────────────────────────

  async getContracts(params: { page?: number; limit?: number; type?: string; status?: string; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.search) where.entityName = { contains: params.search, mode: 'insensitive' };

    const [contracts, total] = await Promise.all([
      (this.prisma as any).contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, role: true } },
          facility: { select: { id: true, name: true, type: true } },
        },
      }),
      (this.prisma as any).contract.count({ where }),
    ]);

    return { contracts, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async createContract(dto: {
    title: string; type: string; entityName: string; userId?: string; facilityId?: string;
    startDate: string; endDate?: string; value?: number; currency?: string; terms?: string; notes?: string; adminId: string;
  }) {
    const contract = await (this.prisma as any).contract.create({
      data: {
        title: dto.title,
        type: dto.type,
        entityName: dto.entityName,
        userId: dto.userId ?? null,
        facilityId: dto.facilityId ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        value: dto.value ?? null,
        currency: dto.currency ?? 'XAF',
        terms: dto.terms ?? null,
        notes: dto.notes ?? null,
        status: 'DRAFT',
      },
    });
    await this.logAudit(dto.adminId, 'CREATE_CONTRACT', contract.id, 'CONTRACT', { type: dto.type, entityName: dto.entityName });
    return contract;
  }

  async updateContract(id: string, dto: { status?: string; signedAt?: string; notes?: string; endDate?: string; value?: number }, adminId: string) {
    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.signedAt) data.signedAt = new Date(dto.signedAt);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.value !== undefined) data.value = dto.value;

    const contract = await (this.prisma as any).contract.update({ where: { id }, data });
    await this.logAudit(adminId, 'UPDATE_CONTRACT', id, 'CONTRACT', dto);
    return contract;
  }

  async getContractById(id: string) {
    const c = await (this.prisma as any).contract.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true, doctorProfile: { select: { specialty: true } } } },
        facility: { select: { id: true, name: true, type: true, city: true } },
      },
    });
    if (!c) throw new Error('Contrat non trouvé');
    return c;
  }

  // ─── Support Tickets ──────────────────────────────────────────────────────

  async getTickets(params: { page?: number; limit?: number; authorType?: string; status?: string; priority?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.authorType) where.authorType = params.authorType;
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;

    const [tickets, total] = await Promise.all([
      (this.prisma as any).supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      (this.prisma as any).supportTicket.count({ where }),
    ]);

    return { tickets, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async updateTicket(id: string, dto: { status?: string; response?: string; assignedTo?: string; priority?: string }, adminId: string) {
    const data: any = { ...dto };
    if (dto.status === 'RESOLVED' && !data.resolvedAt) data.resolvedAt = new Date();

    const ticket = await (this.prisma as any).supportTicket.update({ where: { id }, data });
    await this.logAudit(adminId, 'UPDATE_TICKET', id, 'TICKET', dto);
    return ticket;
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  async getPaymentStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalRevenue,
      totalTransactions,
      successfulTransactions,
      pendingTransactions,
      failedTransactions,
      revenueByProvider,
      revenueTimeline,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { status: 'SUCCESS' } }),
      this.prisma.transaction.count({ where: { status: 'PENDING' } }),
      this.prisma.transaction.count({ where: { status: 'FAILED' } }),
      this.prisma.transaction.groupBy({ by: ['provider' as any], _sum: { amount: true }, _count: true, where: { status: 'SUCCESS' } }),
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: since }, status: 'SUCCESS' },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Build timeline
    const timelineMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      timelineMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const t of revenueTimeline) {
      const key = t.createdAt.toISOString().slice(0, 10);
      if (timelineMap[key] !== undefined) timelineMap[key] += Number(t.amount);
    }

    return {
      totalRevenue: totalRevenue._sum.amount ?? 0,
      totalTransactions,
      successfulTransactions,
      pendingTransactions,
      failedTransactions,
      successRate: totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 100) : 0,
      byProvider: revenueByProvider.map((p: any) => ({ provider: p.provider, amount: p._sum.amount ?? 0, count: p._count })),
      timeline: Object.entries(timelineMap).map(([date, amount]) => ({ date, amount })),
    };
  }

  async getPatientStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalPatients,
      newPatientsThisMonth,
      activePatients,
      avgAppointmentsPerPatient,
      topCities,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'PATIENT' } as any }),
      this.prisma.user.count({ where: { role: 'PATIENT', createdAt: { gte: thirtyDaysAgo } } as any }),
      this.prisma.user.count({ where: { role: 'PATIENT', isActive: true } as any }),
      this.prisma.appointment.groupBy({
        by: ['patientId'],
        _count: true,
      }).then((r) => r.length > 0 ? Math.round(r.reduce((s: any, x: any) => s + x._count, 0) / r.length * 10) / 10 : 0),
      (this.prisma as any).user.groupBy({
        by: ['city'],
        where: { role: 'PATIENT', city: { not: null } },
        _count: true,
        orderBy: { _count: { city: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalPatients,
      newPatientsThisMonth,
      activePatients,
      inactivePatients: totalPatients - activePatients,
      avgAppointmentsPerPatient,
      topCities: topCities.map((c: any) => ({ city: c.city, count: c._count })),
    };
  }

  async getDoctorStats() {
    const [
      totalDoctors,
      activeDoctors,
      bySpecialty,
      topDoctors,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'DOCTOR' } as any }),
      this.prisma.user.count({ where: { role: 'DOCTOR', isActive: true } as any }),
      (this.prisma as any).doctorProfile.groupBy({
        by: ['specialty'],
        _count: true,
        orderBy: { _count: { specialty: 'desc' } },
        take: 10,
      }),
      this.prisma.user.findMany({
        where: { role: 'DOCTOR' } as any,
        take: 10,
        select: {
          id: true,
          fullName: true,
          email: true,
          doctorProfile: { select: { specialty: true, averageRating: true, totalReviews: true } },
          _count: { select: { appointments: true } },
        } as any,
        orderBy: { appointments: { _count: 'desc' } } as any,
      }),
    ]);

    return {
      totalDoctors,
      activeDoctors,
      inactiveDoctors: totalDoctors - activeDoctors,
      bySpecialty: bySpecialty.map((s: any) => ({ specialty: s.specialty ?? 'Non renseignée', count: s._count })),
      topDoctors,
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

  // ─── Facility Managers ────────────────────────────────────────────────────

  async getFacilityManagerProfile(userId: string) {
    const fm = await this.prisma.facilityManager.findUnique({
      where: { userId },
      include: {
        facility: { select: { id: true, name: true, type: true, city: true } },
      },
    });
    if (!fm) return null;

    // Enrich managedDoctorIds with user info
    const doctors = fm.managedDoctorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: fm.managedDoctorIds } },
          select: {
            id: true, fullName: true, email: true,
            doctorProfile: { select: { specialty: true, city: true } },
          },
        })
      : [];

    return { ...fm, managedDoctors: doctors };
  }

  async createFacilityManagerProfile(data: {
    userId: string;
    facilityId: string;
    managedDoctorIds?: string[];
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role !== 'FACILITY_MANAGER') throw new BadRequestException('L\'utilisateur doit avoir le rôle FACILITY_MANAGER');

    const facility = await this.prisma.facility.findUnique({ where: { id: data.facilityId } });
    if (!facility) throw new NotFoundException('Établissement introuvable');

    const existing = await this.prisma.facilityManager.findUnique({ where: { userId: data.userId } });
    if (existing) throw new BadRequestException('Un profil gestionnaire existe déjà pour cet utilisateur');

    const fm = await this.prisma.facilityManager.create({
      data: {
        userId: data.userId,
        facilityId: data.facilityId,
        managedDoctorIds: data.managedDoctorIds ?? [],
      },
      include: {
        facility: { select: { id: true, name: true, type: true, city: true } },
      },
    });
    return fm;
  }

  async updateFacilityManagerProfile(
    userId: string,
    data: { facilityId?: string; managedDoctorIds?: string[] },
  ) {
    const fm = await this.prisma.facilityManager.findUnique({ where: { userId } });
    if (!fm) throw new NotFoundException('Profil gestionnaire introuvable');

    if (data.facilityId) {
      const facility = await this.prisma.facility.findUnique({ where: { id: data.facilityId } });
      if (!facility) throw new NotFoundException('Établissement introuvable');
    }

    return this.prisma.facilityManager.update({
      where: { userId },
      data: {
        ...(data.facilityId && { facilityId: data.facilityId }),
        ...(data.managedDoctorIds !== undefined && { managedDoctorIds: data.managedDoctorIds }),
      },
      include: {
        facility: { select: { id: true, name: true, type: true, city: true } },
      },
    });
  }

  // ─── Finances ─────────────────────────────────────────────────────────────

  async getWallets(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { role: 'DOCTOR' };
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
        orderBy: { fullName: 'asc' },
        select: { id: true, email: true, fullName: true, isActive: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    const doctorIds = doctors.map((d) => d.id);

    const [payments, payouts] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['doctorId'],
        where: { doctorId: { in: doctorIds }, type: 'PAYMENT', status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['doctorId'],
        where: { doctorId: { in: doctorIds }, type: 'PAYOUT', status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);

    const payMap = Object.fromEntries(payments.map((p) => [p.doctorId, Number(p._sum.amount ?? 0)]));
    const outMap = Object.fromEntries(payouts.map((p) => [p.doctorId, Number(p._sum.amount ?? 0)]));

    const wallets = doctors.map((d) => ({
      ...d,
      totalEarned: payMap[d.id] ?? 0,
      totalWithdrawn: outMap[d.id] ?? 0,
      balance: (payMap[d.id] ?? 0) - (outMap[d.id] ?? 0),
    }));

    const grandTotal = {
      totalEarned: wallets.reduce((s, w) => s + w.totalEarned, 0),
      totalWithdrawn: wallets.reduce((s, w) => s + w.totalWithdrawn, 0),
      balance: wallets.reduce((s, w) => s + w.balance, 0),
    };

    return { wallets, total, page, limit, pages: Math.ceil(total / limit), grandTotal };
  }

  async getDoctorWallet(doctorId: string) {
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, email: true, fullName: true },
    });
    if (!doctor) throw new NotFoundException('Médecin introuvable');

    const [paymentsAgg, payoutsAgg, pendingAgg, transactions] = await Promise.all([
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { doctorId, type: 'PAYMENT', status: 'SUCCESS' } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { doctorId, type: 'PAYOUT', status: 'SUCCESS' } }),
      this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { doctorId, status: 'PENDING' } }),
      this.prisma.transaction.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, amount: true, type: true, status: true, provider: true, providerRef: true, description: true, createdAt: true },
      }),
    ]);

    const totalEarned = Number(paymentsAgg._sum.amount ?? 0);
    const totalWithdrawn = Number(payoutsAgg._sum.amount ?? 0);
    const pendingAmount = Number(pendingAgg._sum.amount ?? 0);

    return {
      doctor,
      summary: { balance: totalEarned - totalWithdrawn, totalEarned, totalWithdrawn, pendingAmount },
      transactions,
    };
  }

  async updateTransaction(id: string, data: { status?: string; description?: string }) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Transaction introuvable');
    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  async createTransaction(data: {
    doctorId: string;
    type: string;
    amount: number;
    description: string;
    provider?: string;
  }) {
    const doctor = await this.prisma.user.findUnique({ where: { id: data.doctorId } });
    if (!doctor) throw new NotFoundException('Médecin introuvable');
    return this.prisma.transaction.create({
      data: {
        doctorId: data.doctorId,
        type: data.type as any,
        amount: data.amount,
        status: 'SUCCESS',
        provider: (data.provider ?? 'STRIPE') as any,
        patientId: data.doctorId, // required field, use doctorId as placeholder for manual entries
        description: data.description,
      },
    });
  }

  // ─── Team Members ─────────────────────────────────────────────────────────

  async getTeamMembers(params: { userId?: string; ownerId?: string; search?: string }) {
    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.ownerId) where.ownerId = params.ownerId;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    const members = await this.prisma.teamMember.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    // Enrich with owner info
    const ownerIds = [...new Set(members.map((m) => m.ownerId))];
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, fullName: true, email: true },
    });
    const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o]));
    return members.map((m) => ({ ...m, owner: ownerMap[m.ownerId] ?? null }));
  }

  async getTeamMemberById(id: string) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Membre introuvable');
    const owner = await this.prisma.user.findUnique({
      where: { id: member.ownerId },
      select: { id: true, fullName: true, email: true },
    });
    return { ...member, owner };
  }

  async updateTeamMember(
    id: string,
    data: { role?: string; isManager?: boolean; status?: string; permissions?: string[] },
  ) {
    const member = await this.prisma.teamMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Membre introuvable');
    return this.prisma.teamMember.update({
      where: { id },
      data: {
        ...(data.role !== undefined && { role: data.role as any }),
        ...(data.isManager !== undefined && { isManager: data.isManager }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.permissions !== undefined && { permissions: data.permissions }),
      },
    });
  }

  // ─── Correspondences ──────────────────────────────────────────────────────

  async getCorrespondences(filters: {
    category?: string;
    isRead?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page  = filters.page  || 1;
    const limit = filters.limit || 20;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (filters.category) where.category = filters.category;
    if (filters.isRead !== undefined) where.isRead = filters.isRead === 'true';
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { sender:    { fullName: { contains: filters.search, mode: 'insensitive' } } },
        { recipient: { fullName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.medicalCorrespondence.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender:    { select: { id: true, fullName: true, avatarUrl: true, doctorProfile: { select: { specialty: true } } } },
          recipient: { select: { id: true, fullName: true, avatarUrl: true, doctorProfile: { select: { specialty: true } } } },
          patient:   { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.medicalCorrespondence.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCorrespondenceById(id: string) {
    return this.prisma.medicalCorrespondence.findUniqueOrThrow({
      where: { id },
      include: {
        sender:    { select: { id: true, fullName: true, avatarUrl: true, doctorProfile: { select: { specialty: true, city: true } } } },
        recipient: { select: { id: true, fullName: true, avatarUrl: true, doctorProfile: { select: { specialty: true, city: true } } } },
        patient:   { select: { id: true, fullName: true, email: true, avatarUrl: true } },
      },
    });
  }

  // ─── 2FA Admin ────────────────────────────────────────────────────────────

  async get2faStats() {
    const [total, enabled, locked] = await Promise.all([
      this.prisma.twoFactorAuth.count(),
      this.prisma.twoFactorAuth.count({ where: { isEnabled: true } }),
      this.prisma.twoFactorAuth.count({ where: { lockedUntil: { gt: new Date() } } }),
    ]);
    const totalUsers = await this.prisma.user.count();
    return { total, enabled, locked, totalUsers, adoptionRate: totalUsers ? Math.round((enabled / totalUsers) * 100) : 0 };
  }

  async get2faUsers(filters: { search?: string; status?: string; page?: number; limit?: number }) {
    const page  = filters.page  || 1;
    const limit = filters.limit || 20;
    const skip  = (page - 1) * limit;

    const where: any = { twoFactorAuth: { isNot: null } };
    if (filters.status === 'enabled')  where.twoFactorAuth = { isEnabled: true };
    if (filters.status === 'disabled') where.twoFactorAuth = { isEnabled: false };
    if (filters.status === 'locked')   where.twoFactorAuth = { lockedUntil: { gt: new Date() } };
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email:    { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fullName: true, email: true, role: true, avatarUrl: true,
          twoFactorAuth: {
            select: { isEnabled: true, lastUsedAt: true, failedAttempts: true, lockedUntil: true, createdAt: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async disable2faForUser(userId: string) {
    const tfa = await this.prisma.twoFactorAuth.findUnique({ where: { userId } });
    if (!tfa) throw new Error('Aucune configuration 2FA trouvée pour cet utilisateur');
    return this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: false, secret: null, backupCodes: [], failedAttempts: 0, lockedUntil: null },
    });
  }

  async unlock2faForUser(userId: string) {
    return this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }
}
