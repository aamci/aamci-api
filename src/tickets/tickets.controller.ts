import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Req() req,
    @Body() body: { title: string; description: string; category?: string; priority?: string },
  ) {
    return this.ticketsService.createTicket(req.user.userId, body);
  }

  @Get('my')
  getMyTickets(@Req() req) {
    return this.ticketsService.getMyTickets(req.user.userId);
  }
}
