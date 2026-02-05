import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  getStatus(@Request() req) {
    return this.twoFactorService.getStatus(req.user.sub);
  }

  @Post('generate')
  generateSecret(@Request() req) {
    return this.twoFactorService.generateSecret(req.user.sub);
  }

  @Post('enable')
  enable(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.enable(req.user.sub, code);
  }

  @Post('disable')
  disable(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.disable(req.user.sub, code);
  }

  @Post('verify')
  verify(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.verify(req.user.sub, code);
  }

  @Post('backup-codes/regenerate')
  regenerateBackupCodes(@Request() req, @Body('code') code: string) {
    return this.twoFactorService.regenerateBackupCodes(req.user.sub, code);
  }
}
