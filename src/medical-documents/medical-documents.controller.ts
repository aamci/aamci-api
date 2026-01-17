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
import { MedicalDocumentsService } from './medical-documents.service';
import { DocumentCategory } from '@prisma/client';

@Controller('medical-documents')
@UseGuards(JwtAuthGuard)
export class MedicalDocumentsController {
  constructor(private medicalDocumentsService: MedicalDocumentsService) {}

  /**
   * POST /medical-documents - Créer un nouveau document
   */
  @Post()
  async createDocument(
    @Req() req,
    @Body() body: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      category?: DocumentCategory;
      title?: string;
      description?: string;
      documentDate?: string;
      doctorId?: string;
      appointmentId?: string;
      isPrivate?: boolean;
    },
  ) {
    const patientId = req.user.id || req.user.userId;
    return this.medicalDocumentsService.createDocument(patientId, {
      ...body,
      documentDate: body.documentDate ? new Date(body.documentDate) : undefined,
    });
  }

  /**
   * GET /medical-documents - Récupérer mes documents
   */
  @Get()
  async getMyDocuments(@Req() req) {
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;
    return this.medicalDocumentsService.getPatientDocuments(userId, userId, userRole);
  }

  /**
   * GET /medical-documents/patient/:patientId - Récupérer les documents d'un patient (pour médecin)
   */
  @Get('patient/:patientId')
  async getPatientDocuments(@Req() req, @Param('patientId') patientId: string) {
    const requesterId = req.user.id || req.user.userId;
    const requesterRole = req.user.role;
    return this.medicalDocumentsService.getPatientDocuments(patientId, requesterId, requesterRole);
  }

  /**
   * GET /medical-documents/stats - Récupérer les statistiques de mes documents
   */
  @Get('stats')
  async getMyStats(@Req() req) {
    const patientId = req.user.id || req.user.userId;
    return this.medicalDocumentsService.getDocumentStats(patientId);
  }

  /**
   * GET /medical-documents/category/:category - Récupérer les documents par catégorie
   */
  @Get('category/:category')
  async getByCategory(@Req() req, @Param('category') category: DocumentCategory) {
    const patientId = req.user.id || req.user.userId;
    return this.medicalDocumentsService.getDocumentsByCategory(patientId, category);
  }

  /**
   * GET /medical-documents/:id - Récupérer un document par ID
   */
  @Get(':id')
  async getDocument(@Req() req, @Param('id') documentId: string) {
    const requesterId = req.user.id || req.user.userId;
    const requesterRole = req.user.role;
    return this.medicalDocumentsService.getDocument(documentId, requesterId, requesterRole);
  }

  /**
   * PUT /medical-documents/:id - Mettre à jour un document
   */
  @Put(':id')
  async updateDocument(
    @Req() req,
    @Param('id') documentId: string,
    @Body() body: {
      title?: string;
      description?: string;
      category?: DocumentCategory;
      documentDate?: string;
      isPrivate?: boolean;
    },
  ) {
    const patientId = req.user.id || req.user.userId;
    return this.medicalDocumentsService.updateDocument(documentId, patientId, {
      ...body,
      documentDate: body.documentDate ? new Date(body.documentDate) : undefined,
    });
  }

  /**
   * DELETE /medical-documents/:id - Supprimer un document
   */
  @Delete(':id')
  async deleteDocument(@Req() req, @Param('id') documentId: string) {
    const patientId = req.user.id || req.user.userId;
    return this.medicalDocumentsService.deleteDocument(documentId, patientId);
  }

  /**
   * POST /medical-documents/:id/share - Partager un document avec un médecin
   */
  @Post(':id/share')
  async shareDocument(
    @Req() req,
    @Param('id') documentId: string,
    @Body() body: { doctorId: string },
  ) {
    const patientId = req.user.id || req.user.userId;
    return this.medicalDocumentsService.shareDocument(documentId, patientId, body.doctorId);
  }

  /**
   * DELETE /medical-documents/:id/share/:doctorId - Retirer le partage avec un médecin
   */
  @Delete(':id/share/:doctorId')
  async unshareDocument(
    @Req() req,
    @Param('id') documentId: string,
    @Param('doctorId') doctorId: string,
  ) {
    const patientId = req.user.id || req.user.userId;
    return this.medicalDocumentsService.unshareDocument(documentId, patientId, doctorId);
  }
}
