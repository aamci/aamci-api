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
    return this.healthRecordsService.getMyRecord(req.user.sub);
  }

  @Get('me/full')
  getFullRecord(@Request() req) {
    return this.healthRecordsService.getFullRecord(req.user.sub);
  }

  @Get('me/vitals')
  getMyVitals(@Request() req) {
    return this.healthRecordsService.getVitals(req.user.sub);
  }

  @Get('me/history')
  getMyMedicalHistory(@Request() req) {
    return this.healthRecordsService.getMedicalHistory(req.user.sub);
  }

  @Get('me/vaccinations')
  getMyVaccinations(@Request() req) {
    return this.healthRecordsService.getVaccinations(req.user.sub);
  }

  @Get('me/treatments')
  getMyTreatments(@Request() req) {
    return this.healthRecordsService.getTreatments(req.user.sub);
  }

  @Get('me/lab-results')
  getMyLabResults(@Request() req) {
    return this.healthRecordsService.getLabResults(req.user.sub);
  }

  @Get('me/observations')
  getMyObservations(@Request() req) {
    return this.healthRecordsService.getObservations(req.user.sub);
  }

  @Get('me/export')
  exportMyRecord(@Request() req) {
    return this.healthRecordsService.exportRecord(req.user.sub);
  }

  @Put('me')
  updateMyRecord(@Request() req, @Body() updateDto: UpdateHealthRecordDto) {
    return this.healthRecordsService.updateMyRecord(req.user.sub, updateDto);
  }

  @Post('me/allergies')
  addAllergy(@Request() req, @Body('allergy') allergy: string) {
    return this.healthRecordsService.addAllergy(req.user.sub, allergy);
  }

  @Delete('me/allergies/:allergy')
  removeAllergy(@Request() req, @Param('allergy') allergy: string) {
    return this.healthRecordsService.removeAllergy(req.user.sub, allergy);
  }

  // Doctor access endpoints
  @Get('patient/:patientId')
  getPatientRecord(@Param('patientId') patientId: string, @Request() req) {
    return this.healthRecordsService.getPatientRecord(patientId, req.user.sub);
  }
}
