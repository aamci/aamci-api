import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HealthRecordsService } from './health-records.service';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('health-records')
@UseGuards(JwtAuthGuard)
export class HealthRecordsController {
  constructor(private readonly healthRecordsService: HealthRecordsService) {}

  @Get('me')
  getMyRecord(@Request() req) {
    return this.healthRecordsService.getMyRecord(req.user.userId);
  }

  @Get('me/full')
  getFullRecord(@Request() req) {
    return this.healthRecordsService.getFullRecord(req.user.userId);
  }

  @Get('me/vitals')
  getMyVitals(@Request() req) {
    return this.healthRecordsService.getVitals(req.user.userId);
  }

  @Get('me/history')
  getMyMedicalHistory(@Request() req) {
    return this.healthRecordsService.getMedicalHistory(req.user.userId);
  }

  @Get('me/vaccinations')
  getMyVaccinations(@Request() req) {
    return this.healthRecordsService.getVaccinations(req.user.userId);
  }

  @Get('me/treatments')
  getMyTreatments(@Request() req) {
    return this.healthRecordsService.getTreatments(req.user.userId);
  }

  @Get('me/lab-results')
  getMyLabResults(@Request() req) {
    return this.healthRecordsService.getLabResults(req.user.userId);
  }

  @Get('me/observations')
  getMyObservations(@Request() req) {
    return this.healthRecordsService.getObservations(req.user.userId);
  }

  @Get('me/export')
  exportMyRecord(@Request() req) {
    return this.healthRecordsService.exportRecord(req.user.userId);
  }

  @Put('me')
  updateMyRecord(@Request() req, @Body() updateDto: UpdateHealthRecordDto) {
    return this.healthRecordsService.updateMyRecord(req.user.userId, updateDto);
  }

  @Post('me/allergies')
  addAllergy(@Request() req, @Body('allergy') allergy: string) {
    return this.healthRecordsService.addAllergy(req.user.userId, allergy);
  }

  @Delete('me/allergies/:allergy')
  removeAllergy(@Request() req, @Param('allergy') allergy: string) {
    return this.healthRecordsService.removeAllergy(req.user.userId, allergy);
  }

  // Doctor access endpoints
  @Get('patient/:patientId')
  getPatientRecord(@Param('patientId') patientId: string, @Request() req) {
    return this.healthRecordsService.getPatientRecord(patientId, req.user.userId);
  }
}
