import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  getStatus(@Request() req) {
    return this.twoFactorService.getStatus(req.user.userId);
  }

  @Post('generate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  generateSecret(@Request() req) {
    return this.twoFactorService.generateSecret(req.user.userId);
  }

  @Post('enable')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  enable(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.enable(req.user.userId, code);
  }

  @Post('disable')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  disable(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.disable(req.user.userId, code);
  }

  @Post('verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verify(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.verify(req.user.userId, code);
  }

  @Post('backup-codes/regenerate')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  regenerateBackupCodes(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.regenerateBackupCodes(req.user.userId, code);
  }
}
