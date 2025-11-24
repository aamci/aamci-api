// apps/api/src/wallet/wallet.controller.ts
import { Controller, Get, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('me')
  async me(@Req() req) {
    const user = req.user;
    if (!user || user.role !== 'DOCTOR') {
      throw new ForbiddenException('Réservé aux médecins');
    }
    return this.wallet.getDoctorWallet(user.userId);
  }

  @Get('me/transactions')
  async list(@Req() req, @Query('take') take?: string, @Query('cursor') cursor?: string) {
    const user = req.user;
    if (!user || user.role !== 'DOCTOR') {
      throw new ForbiddenException('Réservé aux médecins');
    }
    const n = take ? Math.min(Math.max(Number(take) || 20, 1), 100) : 20;
    return this.wallet.listDoctorTransactions(user.userId, n, cursor);
  }
}