import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateNotificationDto) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.create(dto);
  }

  @Get()
  async findAll(@Req() req, @Query('unreadOnly') unreadOnly?: string) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.findAllByUser(userId, unreadOnly === 'true');
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    const count = await this.service.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.markAsRead(id, userId);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.markAllAsRead(userId);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.remove(id, userId);
  }
}
