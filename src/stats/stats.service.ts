// apps/api/src/stats/stats.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoctorOverview(doctorId: string) {
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const since30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

    // 1) Récupération brute des données nécessaires
    const [
      allAppointments,
      upcomingAppointments,
      confirmedThisMonth,
      revenueThisMonthAgg,
    ] = await Promise.all([
      // tous les rendez-vous du docteur
      this.prisma.appointment.findMany({
        where: {
          slot: {
            ownerId: doctorId,
            ownerType: 'DOCTOR',
          },
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      }),

      // rendez-vous futurs (non annulés)
      this.prisma.appointment.count({
        where: {
          slot: {
            ownerId: doctorId,
            ownerType: 'DOCTOR',
            start: {
              gte: now,
            },
          },
          status: {
            not: 'CANCELLED',
          },
        },
      }),

      // rendez-vous confirmés ce mois-ci
      this.prisma.appointment.count({
        where: {
          slot: {
            ownerId: doctorId,
            ownerType: 'DOCTOR',
          },
          status: 'CONFIRMED',
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
      }),

      // revenu du mois (Transactions)
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          doctorId,
          type: 'PAYMENT',    // ou ce qui correspond dans ton enum
          status: 'SUCCESS',  // adapte si tu utilises un autre champ
          createdAt: {
            gte: startOfMonth,
            lt: endOfMonth,
          },
        },
      }),
    ]);

    const totalAppointments = allAppointments.length;

    // 2) calcul no-show
    const attendedOrNoShow = allAppointments.filter(a =>
      ['CONFIRMED', 'NO_SHOW'].includes(a.status as any),
    );
    const noShowCount = attendedOrNoShow.filter(
      a => a.status === 'NO_SHOW',
    ).length;
    const noShowRate =
      attendedOrNoShow.length === 0
        ? 0
        : noShowCount / attendedOrNoShow.length;

    // 3) timeline des 30 derniers jours (pour les graph)
    const last30 = allAppointments.filter(a => a.createdAt >= since30);

    const countsByDay = new Map<string, number>();
    for (const a of last30) {
      const d = a.createdAt.toISOString().slice(0, 10); // yyyy-mm-dd
      countsByDay.set(d, (countsByDay.get(d) ?? 0) + 1);
    }

    const last30Days: Array<{ date: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      last30Days.push({
        date: key,
        count: countsByDay.get(key) ?? 0,
      });
    }

    const revenueThisMonth = Number(
      revenueThisMonthAgg._sum.amount ?? 0,
    );

    return {
      totalAppointments,
      upcomingAppointments,
      confirmedThisMonth,
      revenueThisMonth,
      noShowRate,
      last30Days,
    };
  }

  async getDoctorNextAppointments(doctorId: string, limit = 5) {
    const now = new Date();

    const list = await this.prisma.appointment.findMany({
      where: {
        slot: {
          ownerId: doctorId,
          ownerType: 'DOCTOR',
          start: {
            gte: now,
          },
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        slot: true,
        patient: true,
      },
      orderBy: {
        slot: { start: 'asc' },
      },
      take: limit,
    });

    return list;
  }


  // 👉 déjà présent : getDoctorOverview, getDoctorNextAppointments
  // (laisse-les tels quels)

  // 🔹 1. Timeline des revenus d’un doctor (pour graphe € / jour)
  async getDoctorRevenueTimeline(doctorId: string, days = 30) {
    const now = new Date();
    const since = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const tx = await this.prisma.transaction.findMany({
      where: {
        doctorId,
        type: 'PAYMENT',      // adapte selon ta logique
        status: 'SUCCESS',    // idem
        createdAt: { gte: since },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const map = new Map<string, number>();
    for (const t of tx) {
      const d = t.createdAt.toISOString().slice(0, 10);
      const curr = map.get(d) ?? 0;
      map.set(d, curr + Number(t.amount));
    }

    const series: Array<{ date: string; amount: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      series.push({
        date: key,
        amount: map.get(key) ?? 0,
      });
    }

    return series;
  }

  // 🔹 2. Overview global pour l’admin
  async getAdminOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      appointmentsToday,
      transactionsMonth,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'DOCTOR' } }),
      this.prisma.user.count({ where: { role: 'PATIENT' } }),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({
        where: {
          createdAt: { gte: last24h },
        },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'PAYMENT',
          status: 'SUCCESS',
          createdAt: { gte: startOfMonth, lt: endOfMonth },
        },
      }),
    ]);

    const monthlyRevenue = Number(transactionsMonth._sum.amount ?? 0);

    return {
      totals: {
        users: totalUsers,
        doctors: totalDoctors,
        patients: totalPatients,
        appointments: totalAppointments,
      },
      activity: {
        appointmentsLast24h: appointmentsToday,
      },
      revenue: {
        monthlyRevenue,
      },
    };
  }

  // 🔹 3. Stats détaillées par doctor (pour un tableau admin)
  async getAdminDoctorsStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // RDV par médecin
    const appointments = await this.prisma.appointment.groupBy({
      by: ['slotId', 'status'],
      _count: { _all: true },
    });

    const slots = await this.prisma.availabilitySlot.findMany({
      select: { id: true, ownerId: true, ownerType: true },
    });

    const slotById = new Map(slots.map((s) => [s.id, s]));

    // revenu par médecin depuis début du mois
    const tx = await this.prisma.transaction.groupBy({
      by: ['doctorId'],
      _sum: { amount: true },
      where: {
        type: 'PAYMENT',
        status: 'SUCCESS',
        createdAt: { gte: startOfMonth },
      },
    });

    const doctors = await this.prisma.user.findMany({
      where: { role: 'DOCTOR' },
      select: { id: true, email: true },
    });

    const statsByDoctor = new Map<
      string,
      {
        doctorId: string;
        email: string;
        totalAppointments: number;
        confirmed: number;
        cancelled: number;
        revenueMonth: number;
      }
    >();

    for (const d of doctors) {
      statsByDoctor.set(d.id, {
        doctorId: d.id,
        email: d.email,
        totalAppointments: 0,
        confirmed: 0,
        cancelled: 0,
        revenueMonth: 0,
      });
    }

    for (const a of appointments) {
      const slot = slotById.get(a.slotId);
      if (!slot || slot.ownerType !== 'DOCTOR') continue;
      const entry = statsByDoctor.get(slot.ownerId);
      if (!entry) continue;
      entry.totalAppointments += a._count._all;
      if (a.status === 'CONFIRMED') entry.confirmed += a._count._all;
      if (a.status === 'CANCELLED') entry.cancelled += a._count._all;
    }

    for (const t of tx) {
      const entry = statsByDoctor.get(t.doctorId);
      if (!entry) continue;
      entry.revenueMonth = Number(t._sum.amount ?? 0);
    }

    return Array.from(statsByDoctor.values());
  }

}