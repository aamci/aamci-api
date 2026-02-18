import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CalendarSyncService } from './calendar-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateCalendarConnectionDto,
  UpdateCalendarConnectionDto,
  CalendarProvider,
} from './dto/create-calendar-connection.dto';

@Controller('calendar-sync')
export class CalendarSyncController {
  constructor(private readonly calendarSyncService: CalendarSyncService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getConnections(@Request() req) {
    return this.calendarSyncService.getConnections(req.user.userId);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  getSyncSettings(@Request() req) {
    return this.calendarSyncService.getSyncSettings(req.user.userId);
  }

  @Get('ical-url')
  @UseGuards(JwtAuthGuard)
  getICalUrl(@Request() req) {
    return this.calendarSyncService.getICalUrl(req.user.userId);
  }

  @Get('ical/:token')
  async getICalFeed(@Param('token') token: string, @Res() res: Response) {
    const content = await this.calendarSyncService.getICalFeed(token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(content);
  }

  @Get(':provider')
  @UseGuards(JwtAuthGuard)
  getConnection(@Request() req, @Param('provider') provider: CalendarProvider) {
    return this.calendarSyncService.getConnection(req.user.userId, provider);
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  createConnection(@Request() req, @Body() createDto: CreateCalendarConnectionDto) {
    return this.calendarSyncService.createConnection(req.user.userId, createDto);
  }

  @Put(':provider')
  @UseGuards(JwtAuthGuard)
  updateConnection(
    @Request() req,
    @Param('provider') provider: CalendarProvider,
    @Body() updateDto: UpdateCalendarConnectionDto,
  ) {
    return this.calendarSyncService.updateConnection(req.user.userId, provider, updateDto);
  }

  @Put(':provider/settings')
  @UseGuards(JwtAuthGuard)
  updateSyncSettings(
    @Request() req,
    @Param('provider') provider: CalendarProvider,
    @Body() settings: Partial<UpdateCalendarConnectionDto>,
  ) {
    return this.calendarSyncService.updateSyncSettings(req.user.userId, provider, settings);
  }

  @Post(':provider/sync')
  @UseGuards(JwtAuthGuard)
  syncCalendar(@Request() req, @Param('provider') provider: CalendarProvider) {
    return this.calendarSyncService.syncCalendar(req.user.userId, provider);
  }

  @Post('sync-all')
  @UseGuards(JwtAuthGuard)
  syncAllCalendars(@Request() req) {
    return this.calendarSyncService.syncAllCalendars(req.user.userId);
  }

  @Delete(':provider')
  @UseGuards(JwtAuthGuard)
  disconnect(@Request() req, @Param('provider') provider: CalendarProvider) {
    return this.calendarSyncService.disconnect(req.user.userId, provider);
  }
}
