import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientRecordService } from './patient-record.service';

@Controller('patient-record')
@UseGuards(JwtAuthGuard)
export class PatientRecordController {
  constructor(private patientRecordService: PatientRecordService) {}

  // ==========================================
  // DOSSIER COMPLET
  // ==========================================

  @Get(':patientId')
  async getFullRecord(@Param('patientId') patientId: string, @Request() req: any) {
    return this.patientRecordService.getFullRecord(patientId);
  }

  // ==========================================
  // PROFIL PATIENT
  // ==========================================

  @Get(':patientId/profile')
  async getPatientProfile(@Param('patientId') patientId: string, @Request() req: any) {
    return this.patientRecordService.getPatientProfile(patientId, req.user.userId);
  }

  @Patch(':patientId/profile')
  async updatePatientProfile(
    @Param('patientId') patientId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.patientRecordService.updatePatientProfile(patientId, req.user.userId, data);
  }

  // ==========================================
  // ANTÉCÉDENTS MÉDICAUX
  // ==========================================

  @Get(':patientId/medical-history')
  async getMedicalHistory(
    @Param('patientId') patientId: string,
    @Query('category') category?: string,
  ) {
    return this.patientRecordService.getMedicalHistory(patientId, category);
  }

  @Get(':patientId/medical-history/stats')
  async getMedicalHistoryStats(@Param('patientId') patientId: string) {
    return this.patientRecordService.getMedicalHistoryStats(patientId);
  }

  @Post(':patientId/medical-history')
  async createMedicalHistory(
    @Param('patientId') patientId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.patientRecordService.createMedicalHistory(patientId, req.user.userId, data);
  }

  @Patch('medical-history/:id')
  async updateMedicalHistory(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.patientRecordService.updateMedicalHistory(id, req.user.userId, data);
  }

  @Delete('medical-history/:id')
  async deleteMedicalHistory(@Param('id') id: string, @Request() req: any) {
    return this.patientRecordService.deleteMedicalHistory(id, req.user.userId);
  }

  // ==========================================
  // VACCINATIONS
  // ==========================================

  @Get(':patientId/vaccinations')
  async getVaccinations(@Param('patientId') patientId: string) {
    return this.patientRecordService.getVaccinations(patientId);
  }

  @Get(':patientId/vaccinations/stats')
  async getVaccinationsStats(@Param('patientId') patientId: string) {
    return this.patientRecordService.getVaccinationsStats(patientId);
  }

  @Post(':patientId/vaccinations')
  async createVaccination(@Param('patientId') patientId: string, @Body() data: any) {
    return this.patientRecordService.createVaccination(patientId, data);
  }

  @Patch('vaccinations/:id')
  async updateVaccination(@Param('id') id: string, @Body() data: any) {
    return this.patientRecordService.updateVaccination(id, data);
  }

  @Delete('vaccinations/:id')
  async deleteVaccination(@Param('id') id: string) {
    return this.patientRecordService.deleteVaccination(id);
  }

  // ==========================================
  // TRAITEMENTS
  // ==========================================

  @Get(':patientId/treatments')
  async getTreatments(
    @Param('patientId') patientId: string,
    @Query('status') status?: string,
  ) {
    return this.patientRecordService.getTreatments(patientId, status);
  }

  @Get(':patientId/treatments/stats')
  async getTreatmentsStats(@Param('patientId') patientId: string) {
    return this.patientRecordService.getTreatmentsStats(patientId);
  }

  @Post(':patientId/treatments')
  async createTreatment(
    @Param('patientId') patientId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.patientRecordService.createTreatment(patientId, req.user.userId, data);
  }

  @Patch('treatments/:id')
  async updateTreatment(@Param('id') id: string, @Body() data: any) {
    return this.patientRecordService.updateTreatment(id, data);
  }

  @Delete('treatments/:id')
  async deleteTreatment(@Param('id') id: string) {
    return this.patientRecordService.deleteTreatment(id);
  }

  // ==========================================
  // MESURES BIOMÉTRIQUES
  // ==========================================

  @Get(':patientId/biometrics')
  async getBiometrics(
    @Param('patientId') patientId: string,
    @Query('type') type?: string,
  ) {
    return this.patientRecordService.getBiometrics(patientId, type);
  }

  @Get(':patientId/biometrics/latest')
  async getLatestBiometrics(@Param('patientId') patientId: string) {
    return this.patientRecordService.getLatestBiometrics(patientId);
  }

  @Get(':patientId/biometrics/history/:type')
  async getBiometricsHistory(
    @Param('patientId') patientId: string,
    @Param('type') type: string,
    @Query('limit') limit?: string,
  ) {
    return this.patientRecordService.getBiometricsHistory(
      patientId,
      type,
      limit ? parseInt(limit) : 10,
    );
  }

  @Post(':patientId/biometrics')
  async createBiometric(
    @Param('patientId') patientId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.patientRecordService.createBiometric(patientId, req.user.userId, data);
  }

  @Delete('biometrics/:id')
  async deleteBiometric(@Param('id') id: string) {
    return this.patientRecordService.deleteBiometric(id);
  }

  // ==========================================
  // OBSERVATIONS CLINIQUES
  // ==========================================

  @Get(':patientId/observations')
  async getObservations(
    @Param('patientId') patientId: string,
    @Query('category') category?: string,
  ) {
    return this.patientRecordService.getObservations(patientId, category);
  }

  @Post(':patientId/observations')
  async createObservation(
    @Param('patientId') patientId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.patientRecordService.createObservation(patientId, req.user.userId, data);
  }

  @Patch('observations/:id')
  async updateObservation(@Param('id') id: string, @Body() data: any) {
    return this.patientRecordService.updateObservation(id, data);
  }

  @Delete('observations/:id')
  async deleteObservation(@Param('id') id: string) {
    return this.patientRecordService.deleteObservation(id);
  }

  // ==========================================
  // RÉSULTATS DE LABORATOIRE
  // ==========================================

  @Get(':patientId/lab-results')
  async getLabResults(
    @Param('patientId') patientId: string,
    @Query('category') category?: string,
  ) {
    return this.patientRecordService.getLabResults(patientId, category);
  }

  @Post(':patientId/lab-results')
  async createLabResult(
    @Param('patientId') patientId: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.patientRecordService.createLabResult(patientId, req.user.userId, data);
  }

  @Delete('lab-results/:id')
  async deleteLabResult(@Param('id') id: string) {
    return this.patientRecordService.deleteLabResult(id);
  }

  // ==========================================
  // CONTACTS D'URGENCE
  // ==========================================

  @Get(':patientId/emergency-contacts')
  async getEmergencyContacts(@Param('patientId') patientId: string) {
    return this.patientRecordService.getEmergencyContacts(patientId);
  }

  @Post(':patientId/emergency-contacts')
  async createEmergencyContact(@Param('patientId') patientId: string, @Body() data: any) {
    return this.patientRecordService.createEmergencyContact(patientId, data);
  }

  @Patch('emergency-contacts/:id')
  async updateEmergencyContact(@Param('id') id: string, @Body() data: any) {
    return this.patientRecordService.updateEmergencyContact(id, data);
  }

  @Delete('emergency-contacts/:id')
  async deleteEmergencyContact(@Param('id') id: string) {
    return this.patientRecordService.deleteEmergencyContact(id);
  }

  // ==========================================
  // CONSENTEMENTS
  // ==========================================

  @Get(':patientId/consents')
  async getConsents(@Param('patientId') patientId: string) {
    return this.patientRecordService.getConsents(patientId);
  }

  @Post(':patientId/consents')
  async updateConsent(
    @Param('patientId') patientId: string,
    @Body() data: { type: string; granted: boolean },
    @Request() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.patientRecordService.updateConsent(patientId, data.type, data.granted, ipAddress);
  }

  // ==========================================
  // HISTORIQUE DES CONSULTATIONS
  // ==========================================

  @Get(':patientId/appointments')
  async getAppointmentHistory(@Param('patientId') patientId: string) {
    return this.patientRecordService.getAppointmentHistory(patientId);
  }

  // ==========================================
  // PARTAGE DU DOSSIER
  // ==========================================

  @Post('share')
  async shareDossier(
    @Request() req: any,
    @Body() body: { doctorId: string; note?: string },
  ) {
    return this.patientRecordService.shareDossier(req.user.userId, body.doctorId, body.note);
  }
}
