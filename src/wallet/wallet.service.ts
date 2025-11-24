// apps/api/src/wallet/wallet.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoctorWallet(doctorId: string) {
    // Agrégations revenus / payouts
    const [paymentsAgg, payoutsAgg, pendingPayoutsAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          doctorId,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          doctorId,
          type: 'PAYOUT',
          status: 'SUCCESS',
        },
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          doctorId,
          type: 'PAYOUT',
          status: 'PENDING',
        },
      }),
    ]);

    const totalPayments = Number(paymentsAgg._sum.amount ?? 0);
    const totalPayouts = Number(payoutsAgg._sum.amount ?? 0);
    const pendingPayouts = Number(pendingPayoutsAgg._sum.amount ?? 0);

    const balance = totalPayments - totalPayouts;

    const lastTransactions = await this.prisma.transaction.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      summary: {
        balance,
        totalPayments,
        totalPayouts,
        pendingPayouts,
      },
      lastTransactions,
    };
  }

  async listDoctorTransactions(doctorId: string, take = 50, cursor?: string) {
    const where = { doctorId };

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
    });

    const nextCursor =
      transactions.length === take ? transactions[transactions.length - 1].id : null;

    return {
      data: transactions,
      nextCursor,
    };
  }
}