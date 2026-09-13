import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SubscriptionPlan, SubscriptionAddOn, SubscriptionStatus } from '@prisma/client';

const PLAN_LIMITS = {
  FREE:    { appointmentsPerMonth: 5,  messagingEnabled: false, prescriptionsEnabled: false, maxAppointmentKinds: 1, statsEnabled: false },
  STARTER: { appointmentsPerMonth: 50, messagingEnabled: true,  prescriptionsEnabled: true,  maxAppointmentKinds: 3, statsEnabled: true },
  PRO:     { appointmentsPerMonth: -1, messagingEnabled: true,  prescriptionsEnabled: true,  maxAppointmentKinds: -1, statsEnabled: true },
};

const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  FREE: 0,
  STARTER: 20000,
  PRO: 50000,
};

const ADDON_PRICES: Record<SubscriptionAddOn, number> = {
  TELECONSULTATION: 15000,
  TEAM_MANAGEMENT: 20000,
  SEARCH_PRIORITY: 10000,
  CORRESPONDENCES: 8000,
};

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    let sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { addOns: true },
    });
    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: { userId, plan: 'FREE', status: 'ACTIVE' },
        include: { addOns: true },
      });
    }
    return this.format(sub);
  }

  async changePlan(userId: string, plan: SubscriptionPlan) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: plan === 'FREE' ? null : periodEnd,
        cancelledAt: null,
      },
      create: {
        userId,
        plan,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: plan === 'FREE' ? null : periodEnd,
      },
      include: { addOns: true },
    });

    if (plan === 'FREE') {
      await this.prisma.subscriptionAddOnRecord.deleteMany({ where: { subscriptionId: sub.id } });
    }

    return this.format(sub);
  }

  async toggleAddOn(userId: string, addOn: SubscriptionAddOn) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { addOns: true },
    });
    if (!sub || sub.plan === 'FREE') throw new ForbiddenException('Add-ons require Starter or Pro plan');

    const existing = sub.addOns.find(a => a.addOn === addOn);
    if (existing) {
      await this.prisma.subscriptionAddOnRecord.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.subscriptionAddOnRecord.create({
        data: { subscriptionId: sub.id, addOn },
      });
    }

    return this.getOrCreate(userId);
  }

  async cancel(userId: string) {
    const sub = await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { addOns: true },
    });
    return this.format(sub);
  }

  async hasAddOn(userId: string, addOn: SubscriptionAddOn): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { addOns: { where: { addOn } } },
    });
    return !!sub?.addOns.length;
  }

  async getPlan(userId: string): Promise<SubscriptionPlan> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    return sub?.plan ?? 'FREE';
  }

  getLimits(plan: SubscriptionPlan) {
    return PLAN_LIMITS[plan];
  }

  getPlanPrices() {
    return PLAN_PRICES;
  }

  getAddOnPrices() {
    return ADDON_PRICES;
  }

  private format(sub: any) {
    return {
      ...sub,
      limits: PLAN_LIMITS[sub.plan as SubscriptionPlan],
      planPrice: PLAN_PRICES[sub.plan as SubscriptionPlan],
      addOnPrices: ADDON_PRICES,
    };
  }
}
