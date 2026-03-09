import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicalDocumentsService } from './medical-documents.service';
import { DocumentCategory } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/dicom',
];

@Controller('medical-documents')
@UseGuards(JwtAuthGuard)
export class MedicalDocumentsController {
  constructor(private medicalDocumentsService: MedicalDocumentsService) {}

  /**
   * POST /medical-documents/upload — Upload un fichier vers MinIO
   * multipart/form-data : file + champs optionnels (category, title, description, …)
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      category?: DocumentCategory;
      title?: string;
      description?: string;
      documentDate?: string;
      doctorId?: string;
      appointmentId?: string;
      isPrivate?: string;
    },
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier non autorisé : ${file.mimetype}`,
      );
    }

    const patientId = req.user.userId;

    return this.medicalDocumentsService.uploadAndCreate(patientId, file, {
      category: body.category,
      title: body.title,
      description: body.description,
      documentDate: body.documentDate ? new Date(body.documentDate) : undefined,
      doctorId: body.doctorId,
      appointmentId: body.appointmentId,
      isPrivate: body.isPrivate === 'true',
    });
  }

  /**
   * GET /medical-documents/:id/download — URL présignée de téléchargement (1h)
   */
  @Get(':id/download')
  async getDownloadUrl(@Req() req, @Param('id') documentId: string) {
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const url = await this.medicalDocumentsService.getDownloadUrl(
      documentId,
      requesterId,
      requesterRole,
    );
    return { url };
  }

  /**
   * POST /medical-documents — Créer un document avec URL externe (rétrocompatibilité)
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
    const patientId = req.user.userId;
    return this.medicalDocumentsService.createDocument(patientId, {
      ...body,
      documentDate: body.documentDate ? new Date(body.documentDate) : undefined,
    });
  }

  /**
   * GET /medical-documents — Récupérer mes documents
   */
  @Get()
  async getMyDocuments(@Req() req) {
    const userId = req.user.userId;
    const userRole = req.user.role;
    return this.medicalDocumentsService.getPatientDocuments(
      userId,
      userId,
      userRole,
    );
  }

  /**
   * GET /medical-documents/patient/:patientId — Documents d'un patient (médecin)
   */
  @Get('patient/:patientId')
  async getPatientDocuments(
    @Req() req,
    @Param('patientId') patientId: string,
  ) {
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    return this.medicalDocumentsService.getPatientDocuments(
      patientId,
      requesterId,
      requesterRole,
    );
  }

  /**
   * GET /medical-documents/stats — Statistiques de mes documents
   */
  @Get('stats')
  async getMyStats(@Req() req) {
    return this.medicalDocumentsService.getDocumentStats(req.user.userId);
  }

  /**
   * GET /medical-documents/category/:category — Documents par catégorie
   */
  @Get('category/:category')
  async getByCategory(
    @Req() req,
    @Param('category') category: DocumentCategory,
  ) {
    return this.medicalDocumentsService.getDocumentsByCategory(
      req.user.userId,
      category,
    );
  }

  /**
   * GET /medical-documents/:id — Détail d'un document
   */
  @Get(':id')
  async getDocument(@Req() req, @Param('id') documentId: string) {
    return this.medicalDocumentsService.getDocument(
      documentId,
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * PUT /medical-documents/:id — Mettre à jour les métadonnées
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
    return this.medicalDocumentsService.updateDocument(
      documentId,
      req.user.userId,
      {
        ...body,
        documentDate: body.documentDate ? new Date(body.documentDate) : undefined,
      },
    );
  }

  /**
   * DELETE /medical-documents/:id — Supprimer un document (base + MinIO)
   */
  @Delete(':id')
  async deleteDocument(@Req() req, @Param('id') documentId: string) {
    return this.medicalDocumentsService.deleteDocument(
      documentId,
      req.user.userId,
    );
  }

  /**
   * POST /medical-documents/:id/share — Partager avec un médecin
   */
  @Post(':id/share')
  async shareDocument(
    @Req() req,
    @Param('id') documentId: string,
    @Body() body: { doctorId: string },
  ) {
    return this.medicalDocumentsService.shareDocument(
      documentId,
      req.user.userId,
      body.doctorId,
    );
  }

  /**
   * DELETE /medical-documents/:id/share/:doctorId — Retirer le partage
   */
  @Delete(':id/share/:doctorId')
  async unshareDocument(
    @Req() req,
    @Param('id') documentId: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.medicalDocumentsService.unshareDocument(
      documentId,
      req.user.userId,
      doctorId,
    );
  }
}
