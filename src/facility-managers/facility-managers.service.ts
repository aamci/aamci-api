import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateFacilityManagerDto } from './dto/create-facility-manager.dto';
import { UpdateFacilityManagerDto } from './dto/update-facility-manager.dto';

@Injectable()
export class FacilityManagersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFacilityManagerDto) {
    // Vérifier que l'utilisateur existe et a le bon rôle
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!['FACILITY_MANAGER', 'SECRETARY'].includes(user.role)) {
      throw new BadRequestException('User must have FACILITY_MANAGER or SECRETARY role');
    }

    // Vérifier que l'établissement existe
    const facility = await this.prisma.facility.findUnique({
      where: { id: dto.facilityId },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    // Vérifier qu'il n'y a pas déjà un gestionnaire pour cet utilisateur
    const existing = await this.prisma.facilityManager.findUnique({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException('User is already a facility manager');
    }

    return this.prisma.facilityManager.create({
      data: {
        userId: dto.userId,
        facilityId: dto.facilityId,
        managedDoctorIds: dto.managedDoctorIds || [],
      },
      include: {
        user: true,
        facility: true,
      },
    });
  }

  async findOne(userId: string) {
    return this.prisma.facilityManager.findUnique({
      where: { userId },
      include: {
        user: true,
        facility: true,
      },
    });
  }

  async update(userId: string, dto: UpdateFacilityManagerDto) {
    const manager = await this.findOne(userId);
    if (!manager) {
      throw new NotFoundException('Facility manager not found');
    }

    return this.prisma.facilityManager.update({
      where: { id: manager.id },
      data: {
        facilityId: dto.facilityId,
        managedDoctorIds: dto.managedDoctorIds,
      },
      include: {
        user: true,
        facility: true,
      },
    });
  }

  async assignDoctor(managerId: string, doctorId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
    });

    if (!manager) {
      throw new NotFoundException('Facility manager not found');
    }

    // Vérifier que le docteur existe et a le bon rôle
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new BadRequestException('Invalid doctor ID');
    }

    // Ajouter le docteur à la liste si pas déjà présent
    const managedDoctorIds = manager.managedDoctorIds || [];
    if (!managedDoctorIds.includes(doctorId)) {
      managedDoctorIds.push(doctorId);

      return this.prisma.facilityManager.update({
        where: { id: manager.id },
        data: { managedDoctorIds },
        include: {
          user: true,
          facility: true,
        },
      });
    }

    return manager;
  }

  async removeDoctor(managerId: string, doctorId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
    });

    if (!manager) {
      throw new NotFoundException('Facility manager not found');
    }

    // Retirer le docteur de la liste
    const managedDoctorIds = (manager.managedDoctorIds || []).filter(
      (id) => id !== doctorId,
    );

    return this.prisma.facilityManager.update({
      where: { id: manager.id },
      data: { managedDoctorIds },
      include: {
        user: true,
        facility: true,
      },
    });
  }

  async getManagedDoctors(managerId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
      include: {
        facility: {
          include: {
            doctors: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!manager) {
      return [];
    }

    // Docteurs de la structure
    const facilityDoctorIds = manager.facility.doctors.map((d) => d.userId);

    // Docteurs override individuels
    const overrideDoctorIds = manager.managedDoctorIds || [];

    // Union des deux listes (sans doublons)
    const allDoctorIds = [...new Set([...facilityDoctorIds, ...overrideDoctorIds])];

    return this.prisma.user.findMany({
      where: {
        id: { in: allDoctorIds },
        role: 'DOCTOR',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        city: true,
        isActive: true,
        doctorProfile: true,
      },
    });
  }

  async getFacilityFinances(managerId: string) {
    const doctors = await this.getManagedDoctors(managerId);
    const doctorIds = doctors.map((d) => d.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Wallets (balance only — Wallet model has no totalEarned/totalWithdrawn)
    const wallets = await this.prisma.wallet.findMany({
      where: { doctorId: { in: doctorIds } },
      select: { doctorId: true, balance: true },
    });

    // Compute totalEarned / totalWithdrawn from Transaction
    const [paymentAgg, payoutAgg] = await Promise.all([
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
    const paymentMap = new Map(paymentAgg.map((p) => [p.doctorId, Number(p._sum.amount ?? 0)]));
    const payoutMap = new Map(payoutAgg.map((p) => [p.doctorId, Number(p._sum.amount ?? 0)]));

    // Appointments via slot.ownerId (Appointment has no doctorId directly)
    const [apptThisMonth, apptLastMonth] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          slot: { ownerId: { in: doctorIds }, ownerType: 'DOCTOR' },
          status: 'COMPLETED' as any,
          createdAt: { gte: startOfMonth },
        },
        select: { slot: { select: { ownerId: true } } },
      }),
      this.prisma.appointment.findMany({
        where: {
          slot: { ownerId: { in: doctorIds }, ownerType: 'DOCTOR' },
          status: 'COMPLETED' as any,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        select: { slot: { select: { ownerId: true } } },
      }),
    ]);

    const thisMonthMap = new Map<string, number>();
    for (const a of apptThisMonth) {
      const did = a.slot.ownerId;
      thisMonthMap.set(did, (thisMonthMap.get(did) ?? 0) + 1);
    }
    const lastMonthMap = new Map<string, number>();
    for (const a of apptLastMonth) {
      const did = a.slot.ownerId;
      lastMonthMap.set(did, (lastMonthMap.get(did) ?? 0) + 1);
    }

    const walletMap = new Map(wallets.map((w) => [w.doctorId, w]));

    const perDoctor = doctors.map((d) => {
      const wallet = walletMap.get(d.id);
      return {
        id: d.id,
        fullName: d.fullName,
        email: d.email,
        avatarUrl: (d as any).avatarUrl,
        specialty: (d as any).doctorProfile?.specialty,
        balance: Number(wallet?.balance ?? 0),
        totalEarned: paymentMap.get(d.id) ?? 0,
        totalWithdrawn: payoutMap.get(d.id) ?? 0,
        appointmentsThisMonth: thisMonthMap.get(d.id) ?? 0,
        appointmentsLastMonth: lastMonthMap.get(d.id) ?? 0,
      };
    });

    const totals = perDoctor.reduce(
      (acc, d) => ({
        totalBalance: acc.totalBalance + d.balance,
        totalEarned: acc.totalEarned + d.totalEarned,
        totalWithdrawn: acc.totalWithdrawn + d.totalWithdrawn,
        appointmentsThisMonth: acc.appointmentsThisMonth + d.appointmentsThisMonth,
        appointmentsLastMonth: acc.appointmentsLastMonth + d.appointmentsLastMonth,
      }),
      { totalBalance: 0, totalEarned: 0, totalWithdrawn: 0, appointmentsThisMonth: 0, appointmentsLastMonth: 0 },
    );

    return { totals, perDoctor };
  }

  async getMyFacility(userId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId },
      include: { facility: true },
    });
    if (!manager) throw new NotFoundException('Facility manager not found');
    return manager.facility;
  }

  async updateMyFacility(userId: string, data: any) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId },
    });
    if (!manager) throw new NotFoundException('Facility manager not found');

    const updateData: any = { ...data };
    if (Array.isArray(data.services)) {
      updateData.services = JSON.stringify(data.services);
    }

    return this.prisma.facility.update({
      where: { id: manager.facilityId },
      data: updateData,
    });
  }

  async getManagedAppointments(managerId: string, filters: {
    doctorId?: string;
    date?: string;
    status?: string;
  }) {
    const doctors = await this.getManagedDoctors(managerId);
    const doctorIds = filters.doctorId
      ? doctors.filter(d => d.id === filters.doctorId).map(d => d.id)
      : doctors.map(d => d.id);

    const slotWhere: any = { ownerId: { in: doctorIds }, ownerType: 'DOCTOR' };
    if (filters.date) {
      const d = new Date(filters.date);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      slotWhere.start = { gte: dayStart, lte: dayEnd };
    }

    const where: any = { slot: slotWhere };
    if (filters.status) where.status = filters.status;

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
        slot: { select: { start: true, end: true, ownerId: true } },
        kind: { select: { name: true, durationMins: true, isTelemedicine: true } },
      },
      orderBy: { slot: { start: 'asc' } },
      take: 200,
    });
  }

  async sendAppointmentReminder(managerId: string, appointmentId: string, emailService: any) {
    const doctors = await this.getManagedDoctors(managerId);
    const doctorIds = doctors.map(d => d.id);

    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, slot: { ownerId: { in: doctorIds } } },
      include: {
        patient: { select: { fullName: true, email: true } },
        slot:    { select: { start: true, end: true, ownerId: true } },
        kind:    { select: { name: true } },
      },
    });
    if (!appt) throw new Error('Rendez-vous introuvable ou non autorisé');

    const doctor = doctors.find(d => d.id === appt.slot.ownerId);
    await emailService.sendAppointmentReminder(
      appt.patient.email,
      {
        patientName: appt.patient.fullName || 'Patient',
        doctorName: doctor?.fullName || 'Médecin',
        date: appt.slot.start.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: appt.slot.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        kindName: appt.kind?.name,
      }
    );
    return { success: true };
  }

  async canManageDoctor(managerId: string, doctorId: string): Promise<boolean> {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
      include: {
        facility: {
          include: {
            doctors: true,
          },
        },
      },
    });

    if (!manager) {
      return false;
    }

    // Vérifier si le docteur est dans la structure
    const facilityDoctorIds = manager.facility.doctors.map((d) => d.userId);
    if (facilityDoctorIds.includes(doctorId)) {
      return true;
    }

    // Vérifier si le docteur est dans la liste override
    const overrideIds = manager.managedDoctorIds || [];
    return overrideIds.includes(doctorId);
  }
}
