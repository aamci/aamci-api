import { Controller, Get, Query, Param, Post, Body, UseGuards, Delete } from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('facilities')
export class FacilitiesController {
  constructor(private svc: FacilitiesService) {}

  @Get()
  list(@Query() q) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/doctors')
  getDoctors(
    @Param('id') id: string,
    @Query('specialtyId') specialtyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getDoctorsByFacility(
      id,
      specialtyId || undefined,
      parseInt(page || '1'),
      parseInt(limit || '20')
    );
  }

  @Post(':id/doctors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DOCTOR')
  addDoctor(@Param('id') id: string, @Body() body: { doctorId: string }) {
    return this.svc.addDoctor(id, body.doctorId);
  }

  @Delete(':id/doctors/:doctorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DOCTOR')
  removeDoctor(@Param('id') id: string, @Param('doctorId') doctorId: string) {
    return this.svc.removeDoctor(id, doctorId);
  }
}