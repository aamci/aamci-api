import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionPlan, SubscriptionAddOn } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('me')
  getMySubscription(@Req() req: any) {
    return this.subs.getOrCreate(req.user.id);
  }

  @Post('plan')
  changePlan(@Req() req: any, @Body('plan') plan: SubscriptionPlan) {
    return this.subs.changePlan(req.user.id, plan);
  }

  @Post('addon')
  toggleAddOn(@Req() req: any, @Body('addOn') addOn: SubscriptionAddOn) {
    return this.subs.toggleAddOn(req.user.id, addOn);
  }

  @Post('cancel')
  cancel(@Req() req: any) {
    return this.subs.cancel(req.user.id);
  }

  @Get('prices')
  getPrices() {
    return {
      plans: this.subs.getPlanPrices(),
      addOns: this.subs.getAddOnPrices(),
    };
  }
}
