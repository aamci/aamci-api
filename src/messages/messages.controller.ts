import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get('conversations')
  async getConversations(@Req() req) {
    const userId = req.user.userId;
    return this.svc.getConversations(userId);
  }

  @Get('conversations/:id')
  async getMessages(
    @Param('id') conversationId: string,
    @Req() req,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    const userId = req.user.userId;
    return this.svc.getMessages(
      conversationId,
      userId,
      take ? parseInt(take, 10) : 50,
      cursor,
    );
  }

  @Post('send')
  async sendMessage(
    @Req() req,
    @Body()
    dto: {
      conversationId?: string;
      recipientId?: string;
      content: string;
      type?: string;
    },
  ) {
    const userId = req.user.userId;
    return this.svc.sendMessage(userId, dto);
  }

  @Post('conversations/:id/read')
  async markAsRead(@Param('id') conversationId: string, @Req() req) {
    const userId = req.user.userId;
    return this.svc.markAsRead(conversationId, userId);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    const userId = req.user.userId;
    return this.svc.getUnreadCount(userId);
  }
}
