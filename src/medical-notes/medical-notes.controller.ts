import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicalNotesService } from './medical-notes.service';
import { NoteType } from '@prisma/client';

@Controller('medical-notes')
@UseGuards(JwtAuthGuard)
export class MedicalNotesController {
  constructor(private medicalNotesService: MedicalNotesService) {}

  /**
   * POST /medical-notes - Créer une nouvelle note (médecin uniquement)
   */
  @Post()
  async createNote(
    @Req() req,
    @Body() body: {
      patientId: string;
      type?: NoteType;
      title?: string;
      content: string;
      appointmentId?: string;
      isPrivate?: boolean;
      tags?: string[];
    },
  ) {
    const doctorId = req.user.userId;
    return this.medicalNotesService.createNote(doctorId, body);
  }

  /**
   * GET /medical-notes - Récupérer mes notes (médecin)
   */
  @Get()
  async getMyNotes(
    @Req() req,
    @Query('patientId') patientId?: string,
    @Query('type') type?: NoteType,
    @Query('tags') tags?: string,
  ) {
    const doctorId = req.user.userId;
    return this.medicalNotesService.getMyNotes(doctorId, {
      patientId,
      type,
      tags: tags ? tags.split(',') : undefined,
    });
  }

  /**
   * GET /medical-notes/patient/:patientId - Récupérer les notes d'un patient
   */
  @Get('patient/:patientId')
  async getPatientNotes(@Req() req, @Param('patientId') patientId: string) {
    const doctorId = req.user.userId;
    return this.medicalNotesService.getPatientNotes(patientId, doctorId);
  }

  /**
   * GET /medical-notes/appointment/:appointmentId - Récupérer les notes d'un rendez-vous
   */
  @Get('appointment/:appointmentId')
  async getAppointmentNotes(@Req() req, @Param('appointmentId') appointmentId: string) {
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    return this.medicalNotesService.getAppointmentNotes(appointmentId, requesterId, requesterRole);
  }

  /**
   * GET /medical-notes/tags - Récupérer mes tags utilisés
   */
  @Get('tags')
  async getMyTags(@Req() req) {
    const doctorId = req.user.userId;
    return this.medicalNotesService.getDoctorTags(doctorId);
  }

  /**
   * GET /medical-notes/search - Rechercher dans mes notes
   */
  @Get('search')
  async searchNotes(@Req() req, @Query('q') query: string) {
    const doctorId = req.user.userId;
    return this.medicalNotesService.searchNotes(doctorId, query);
  }

  /**
   * GET /medical-notes/:id - Récupérer une note par ID
   */
  @Get(':id')
  async getNote(@Req() req, @Param('id') noteId: string) {
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    return this.medicalNotesService.getNote(noteId, requesterId, requesterRole);
  }

  /**
   * PUT /medical-notes/:id - Mettre à jour une note
   */
  @Put(':id')
  async updateNote(
    @Req() req,
    @Param('id') noteId: string,
    @Body() body: {
      type?: NoteType;
      title?: string;
      content?: string;
      isPrivate?: boolean;
      tags?: string[];
    },
  ) {
    const doctorId = req.user.userId;
    return this.medicalNotesService.updateNote(noteId, doctorId, body);
  }

  /**
   * DELETE /medical-notes/:id - Supprimer une note
   */
  @Delete(':id')
  async deleteNote(@Req() req, @Param('id') noteId: string) {
    const doctorId = req.user.userId;
    return this.medicalNotesService.deleteNote(noteId, doctorId);
  }
}
