import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlan, SubscriptionAddOn } from '@prisma/client';

export const RequirePlan = (...plans: SubscriptionPlan[]) => SetMetadata('requiredPlans', plans);
export const RequireAddOn = (addOn: SubscriptionAddOn) => SetMetadata('requiredAddOn', addOn);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private reflector: Reflector, private subs: SubscriptionsService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredPlans = this.reflector.get<SubscriptionPlan[]>('requiredPlans', ctx.getHandler());
    const requiredAddOn = this.reflector.get<SubscriptionAddOn>('requiredAddOn', ctx.getHandler());

    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.id;
    if (!userId) return false;

    if (requiredPlans?.length) {
      const plan = await this.subs.getPlan(userId);
      if (!requiredPlans.includes(plan)) {
        throw new ForbiddenException(`Ce fonctionnalité nécessite un plan ${requiredPlans.join(' ou ')}`);
      }
    }

    if (requiredAddOn) {
      const hasAddon = await this.subs.hasAddOn(userId, requiredAddOn);
      if (!hasAddon) {
        throw new ForbiddenException(`Cette fonctionnalité nécessite l'option ${requiredAddOn}`);
      }
    }

    return true;
  }
}
