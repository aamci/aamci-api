import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards, Query } from '@nestjs/common';
import { CorrespondencesService } from './correspondences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('correspondences')
@UseGuards(JwtAuthGuard)
export class CorrespondencesController {
  constructor(private readonly correspondencesService: CorrespondencesService) {}

  @Post()
  create(
    @Req() req,
    @Body() dto: { recipientId: string; patientId?: string; category?: string; subject: string; content: string },
  ) {
    return this.correspondencesService.create(req.user.userId, dto);
  }

  @Get('sent')
  getSent(@Req() req) {
    return this.correspondencesService.getSent(req.user.userId);
  }

  @Get('received')
  getReceived(@Req() req) {
    return this.correspondencesService.getReceived(req.user.userId);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req) {
    return this.correspondencesService.getUnreadCount(req.user.userId);
  }

  @Get('patient/:patientId')
  getForPatient(@Req() req, @Param('patientId') patientId: string) {
    return this.correspondencesService.getForPatient(req.user.userId, patientId);
  }

  @Patch(':id/read')
  markRead(@Req() req, @Param('id') id: string) {
    return this.correspondencesService.markRead(id, req.user.userId);
  }
}
