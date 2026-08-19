import { Controller, Post, Delete, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BlocksService } from './blocks.service';

@UseGuards(JwtAuthGuard)
@Controller('blocks')
export class BlocksController {
  constructor(private svc: BlocksService) {}

  @Post(':userId')
  block(@Req() req, @Param('userId') userId: string) {
    return this.svc.block(req.user.userId, userId);
  }

  @Delete(':userId')
  unblock(@Req() req, @Param('userId') userId: string) {
    return this.svc.unblock(req.user.userId, userId);
  }

  @Get()
  list(@Req() req) {
    return this.svc.listBlocked(req.user.userId);
  }
}
