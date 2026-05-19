// src/users/users.controller.ts
import { Body, Controller, Delete, Get, Post, Put, Query, Req, Res, UseGuards, BadRequestException, Param } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('users/create-patient')
  async createPatient(@Req() req, @Body() dto: {
    fullName: string;
    email: string;
    phone?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
    birthPlace?: string;
    birthName?: string;
  }) {
    const doctorId = await this.users.resolveDoctorId(req.user.userId, req.user.role);

    if (!dto.fullName || !dto.email) {
      throw new BadRequestException('Le nom complet et l\'email sont requis');
    }

    return this.users.createPatient({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      gender: dto.gender,
      birthDate: dto.birthDate,
      birthPlace: dto.birthPlace,
      birthName: dto.birthName,
      createdByDoctorId: doctorId,
    });
  }

  @Get('users/search')
  async search(@Query('q') query: string, @Query('role') role?: string) {
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.users.search(query, role as any);
  }

  @Get('me')
  async me(@Req() req) {
    const userId = req.user.userId;
    return this.users.findById(userId);
  }

  @Put('me')
  async updateMe(@Req() req, @Body() dto: any) {
    const userId = req.user.userId;
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
    const userId = req.user.userId;
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('Mot de passe actuel et nouveau mot de passe requis');
    }
    return this.users.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  @Delete('me')
  async deleteMe(@Req() req) {
    return this.users.anonymizeAccount(req.user.userId);
  }

  @Get('me/export')
  async exportMe(@Req() req, @Res() res: Response) {
    const data = await this.users.exportUserData(req.user.userId);
    const filename = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get('patients')
  async getMyPatients(@Req() req) {
    const doctorId = await this.users.resolveDoctorId(req.user.userId, req.user.role);
    return this.users.getDoctorPatients(doctorId);
  }

  @Get('patients/search')
  async searchPatients(@Req() req, @Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const doctorId = await this.users.resolveDoctorId(req.user.userId, req.user.role);
    return this.users.searchDoctorPatients(doctorId, query);
  }

  @Get('patients/:id')
  async getPatientDetails(@Req() req, @Param('id') patientId: string) {
    if (!patientId) {
      throw new BadRequestException('Patient ID is required');
    }
    const doctorId = await this.users.resolveDoctorId(req.user.userId, req.user.role);
    return this.users.getPatientDetails(patientId, doctorId);
  }
}