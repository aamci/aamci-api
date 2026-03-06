import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('referrals')
@UseGuards(JwtAuthGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  /** Create a new referral (authenticated doctor) */
  @Post()
  create(
    @Req() req,
    @Body() dto: { patientId: string; toDoctorId: string; reason: string; notes?: string; urgency?: string },
  ) {
    return this.referralsService.create(req.user.userId, dto);
  }

  /** Get referrals sent by the current doctor */
  @Get('sent')
  getSent(@Req() req) {
    return this.referralsService.getSent(req.user.userId);
  }

  /** Get referrals received by the current doctor */
  @Get('received')
  getReceived(@Req() req) {
    return this.referralsService.getReceived(req.user.userId);
  }

  /** Get patients transferred to the current doctor (accepted referrals) */
  @Get('received-patients')
  getReceivedPatients(@Req() req) {
    return this.referralsService.getReceivedPatients(req.user.userId);
  }

  /** Accept or decline a received referral */
  @Patch(':id/respond')
  respond(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { status: 'ACCEPTED' | 'DECLINED'; response?: string },
  ) {
    return this.referralsService.respond(id, req.user.userId, dto);
  }

  /** Mark a referral as completed */
  @Patch(':id/complete')
  complete(@Req() req, @Param('id') id: string) {
    return this.referralsService.complete(id, req.user.userId);
  }
}
