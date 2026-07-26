import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JwtAuthGuard } from '../common/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly svc: WaitlistService) {}

  @Post()
  join(@Req() req, @Body() dto: { doctorId: string; date: string; kindId?: string }) {
    return this.svc.join(req.user.userId, dto);
  }

  @Delete(':id')
  leave(@Req() req, @Param('id') id: string) {
    return this.svc.leave(id, req.user.userId);
  }

  @Get('mine')
  mine(@Req() req) {
    return this.svc.myEntries(req.user.userId);
  }

  @Get('doctor/:doctorId')
  doctorList(@Param('doctorId') doctorId: string, @Query('date') date?: string) {
    return this.svc.doctorWaitlist(doctorId, date);
  }
}
