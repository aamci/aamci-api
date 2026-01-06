// src/users/users.controller.ts
import { Body, Controller, Get, Put, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@Req() req) {
    const userId = req.user.id || req.user.userId;
    return this.users.findById(userId);
  }

  @Put('me')
  async updateMe(@Req() req, @Body() dto: any) {
    const userId = req.user.id || req.user.userId;
    return this.users.update(userId, {
      email: dto.email,
      fullName: dto.fullName,
      avatarUrl: dto.avatarUrl,
      phone: dto.phone,
      sex: dto.sex,
      birthdate: dto.birthdate ? new Date(dto.birthdate) : undefined,
      city: dto.city,
    });
  }

  @Put('me/password')
  async changePassword(@Req() req, @Body() dto: any) {
    const userId = req.user.id || req.user.userId;
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('Mot de passe actuel et nouveau mot de passe requis');
    }
    return this.users.changePassword(userId, dto.currentPassword, dto.newPassword);
  }
}