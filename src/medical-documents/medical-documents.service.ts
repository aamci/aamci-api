import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { DocumentCategory } from '@prisma/client';

@Injectable()
export class MedicalDocumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer un nouveau document médical
   */
  async createDocument(patientId: string, data: {
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
  }) {
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
   * Récupérer tous les documents d'un patient
   */
  async getPatientDocuments(patientId: string, requesterId: string, requesterRole: string) {
    // Si c'est le patient lui-même, il voit tous ses documents
    if (patientId === requesterId) {
      return this.prisma.medicalDocument.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Si c'est un médecin, il ne voit que les documents non privés ou partagés avec lui
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
   * Récupérer un document par son ID
   */
  async getDocument(documentId: string, requesterId: string, requesterRole: string) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    // Vérifier l'accès
    const hasAccess =
      document.patientId === requesterId ||
      (requesterRole === 'DOCTOR' && (
        !document.isPrivate ||
        document.sharedWith.includes(requesterId) ||
        document.doctorId === requesterId
      ));

    if (!hasAccess) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce document');
    }

    return document;
  }

  /**
   * Mettre à jour un document
   */
  async updateDocument(documentId: string, patientId: string, data: {
    title?: string;
    description?: string;
    category?: DocumentCategory;
    documentDate?: Date;
    isPrivate?: boolean;
  }) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    if (document.patientId !== patientId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce document');
    }

    return this.prisma.medicalDocument.update({
      where: { id: documentId },
      data,
    });
  }

  /**
   * Supprimer un document
   */
  async deleteDocument(documentId: string, patientId: string) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    if (document.patientId !== patientId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce document');
    }

    await this.prisma.medicalDocument.delete({
      where: { id: documentId },
    });

    return { success: true, message: 'Document supprimé' };
  }

  /**
   * Partager un document avec un médecin
   */
  async shareDocument(documentId: string, patientId: string, doctorId: string) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    if (document.patientId !== patientId) {
      throw new ForbiddenException('Vous ne pouvez pas partager ce document');
    }

    // Vérifier que le médecin existe
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new NotFoundException('Médecin non trouvé');
    }

    // Ajouter le médecin à la liste de partage s'il n'y est pas déjà
    if (document.sharedWith.includes(doctorId)) {
      throw new BadRequestException('Ce document est déjà partagé avec ce médecin');
    }

    return this.prisma.medicalDocument.update({
      where: { id: documentId },
      data: {
        sharedWith: {
          push: doctorId,
        },
      },
    });
  }

  /**
   * Retirer le partage d'un document avec un médecin
   */
  async unshareDocument(documentId: string, patientId: string, doctorId: string) {
    const document = await this.prisma.medicalDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document non trouvé');
    }

    if (document.patientId !== patientId) {
      throw new ForbiddenException('Vous ne pouvez pas modifier le partage de ce document');
    }

    const newSharedWith = document.sharedWith.filter((id) => id !== doctorId);

    return this.prisma.medicalDocument.update({
      where: { id: documentId },
      data: {
        sharedWith: newSharedWith,
      },
    });
  }

  /**
   * Récupérer les documents par catégorie
   */
  async getDocumentsByCategory(patientId: string, category: DocumentCategory) {
    return this.prisma.medicalDocument.findMany({
      where: {
        patientId,
        category,
      },
      orderBy: { documentDate: 'desc' },
    });
  }

  /**
   * Récupérer les statistiques de documents d'un patient
   */
  async getDocumentStats(patientId: string) {
    const documents = await this.prisma.medicalDocument.findMany({
      where: { patientId },
      select: {
        category: true,
        fileSize: true,
      },
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
