import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { StorageService, DOCUMENTS_BUCKET } from '../common/storage.service';
import { DocumentCategory } from '@prisma/client';

@Injectable()
export class MedicalDocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Uploader un fichier vers MinIO et créer l'entrée en base
   */
  async uploadAndCreate(
    patientId: string,
    file: Express.Multer.File,
    meta: {
      category?: DocumentCategory;
      title?: string;
      description?: string;
      documentDate?: Date;
      doctorId?: string;
      appointmentId?: string;
      isPrivate?: boolean;
    },
  ) {
    const objectKey = this.storage.buildDocumentKey(patientId, file.originalname);

    await this.storage.uploadFile(
      DOCUMENTS_BUCKET,
      objectKey,
      file.buffer,
      file.mimetype,
      { 'x-patient-id': patientId },
    );

    const doc = await this.prisma.medicalDocument.create({
      data: {
        patientId,
        fileName: file.originalname,
        fileUrl: objectKey,          // On stocke la clé MinIO (pas une URL publique)
        fileType: file.mimetype,
        fileSize: file.size,
        category: meta.category || 'OTHER',
        title: meta.title,
        description: meta.description,
        documentDate: meta.documentDate,
        doctorId: meta.doctorId,
        appointmentId: meta.appointmentId,
        isPrivate: meta.isPrivate ?? false,
      },
    });

    // Retourner avec URL présignée valide 1h
    const downloadUrl = await this.storage.getPresignedDownloadUrl(
      DOCUMENTS_BUCKET,
      objectKey,
    );

    return { ...doc, downloadUrl };
  }

  /**
   * Créer un document avec une URL externe (rétrocompatibilité — sans upload MinIO)
   */
  async createDocument(
    patientId: string,
    data: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      category?: DocumentCategory;
      title?: string;
      description?: string;
      documentDate?: Date;
      doctorId?: string;
      appointmentId?: string;
      isPrivate?: boolean;
    },
  ) {
    return this.prisma.medicalDocument.create({
      data: {
        patientId,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        category: data.category || 'OTHER',
        title: data.title,
        description: data.description,
        documentDate: data.documentDate,
        doctorId: data.doctorId,
        appointmentId: data.appointmentId,
        isPrivate: data.isPrivate ?? false,
      },
    });
  }

  /**
   * Générer une URL présignée de téléchargement (1h)
   */
  async getDownloadUrl(
    documentId: string,
    requesterId: string,
    requesterRole: string,
  ): Promise<string> {
    const document = await this.getDocument(documentId, requesterId, requesterRole);
    const key = document.fileUrl;

    // Si la valeur ressemble à une vraie URL, la retourner telle quelle
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }

    return this.storage.getPresignedDownloadUrl(DOCUMENTS_BUCKET, key);
  }

  /**
   * Récupérer tous les documents d'un patient
   */
  async getPatientDocuments(
    patientId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    if (patientId === requesterId) {
      return this.prisma.medicalDocument.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (requesterRole === 'DOCTOR') {
      return this.prisma.medicalDocument.findMany({
        where: {
          patientId,
          OR: [
            { isPrivate: false },
            { sharedWith: { has: requesterId } },
            { doctorId: requesterId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    throw new ForbiddenException('Vous n\'avez pas accès à ces documents');
  }

  /**
   * Récupérer un document par son ID (avec vérification d'accès)
   */
  async getDocument(
    documentId: string,
    requesterId: string,
    requesterRole: string,
  ) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document non trouvé');

    const hasAccess =
      document.patientId === requesterId ||
      (requesterRole === 'DOCTOR' &&
        (!document.isPrivate ||
          document.sharedWith.includes(requesterId) ||
          document.doctorId === requesterId));

    if (!hasAccess) throw new ForbiddenException('Vous n\'avez pas accès à ce document');

    return document;
  }

  /**
   * Mettre à jour les métadonnées d'un document
   */
  async updateDocument(
    documentId: string,
    patientId: string,
    data: {
      title?: string;
      description?: string;
      category?: DocumentCategory;
      documentDate?: Date;
      isPrivate?: boolean;
    },
  ) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document non trouvé');
    if (document.patientId !== patientId)
      throw new ForbiddenException('Vous ne pouvez pas modifier ce document');

    return this.prisma.medicalDocument.update({
      where: { id: documentId },
      data,
    });
  }

  /**
   * Supprimer un document (base + MinIO)
   */
  async deleteDocument(documentId: string, patientId: string) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document non trouvé');
    if (document.patientId !== patientId)
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce document');

    // Supprimer du stockage si c'est une clé MinIO (pas une URL externe)
    const key = document.fileUrl;
    if (!key.startsWith('http://') && !key.startsWith('https://')) {
      await this.storage.deleteFile(DOCUMENTS_BUCKET, key);
    }

    await this.prisma.medicalDocument.delete({ where: { id: documentId } });

    return { success: true, message: 'Document supprimé' };
  }

  /**
   * Partager un document avec un médecin
   */
  async shareDocument(documentId: string, patientId: string, doctorId: string) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document non trouvé');
    if (document.patientId !== patientId)
      throw new ForbiddenException('Vous ne pouvez pas partager ce document');

    const doctor = await this.prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.role !== 'DOCTOR')
      throw new NotFoundException('Médecin non trouvé');

    if (document.sharedWith.includes(doctorId))
      throw new BadRequestException('Ce document est déjà partagé avec ce médecin');

    return this.prisma.medicalDocument.update({
      where: { id: documentId },
      data: { sharedWith: { push: doctorId } },
    });
  }

  /**
   * Retirer le partage d'un document avec un médecin
   */
  async unshareDocument(documentId: string, patientId: string, doctorId: string) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new NotFoundException('Document non trouvé');
    if (document.patientId !== patientId)
      throw new ForbiddenException('Vous ne pouvez pas modifier le partage de ce document');

    return this.prisma.medicalDocument.update({
      where: { id: documentId },
      data: { sharedWith: document.sharedWith.filter((id) => id !== doctorId) },
    });
  }

  /**
   * Récupérer les documents par catégorie
   */
  async getDocumentsByCategory(patientId: string, category: DocumentCategory) {
    return this.prisma.medicalDocument.findMany({
      where: { patientId, category },
      orderBy: { documentDate: 'desc' },
    });
  }

  /**
   * Récupérer les statistiques de documents d'un patient
   */
  async getDocumentStats(patientId: string) {
    const documents = await this.prisma.medicalDocument.findMany({
      where: { patientId },
      select: { category: true, fileSize: true },
    });

    const byCategory: Record<string, number> = {};
    let totalSize = 0;

    for (const doc of documents) {
      byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
      totalSize += doc.fileSize;
    }

    return {
      totalDocuments: documents.length,
      totalSizeBytes: totalSize,
      byCategory,
    };
  }
}
