import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { Readable } from 'stream';

export const DOCUMENTS_BUCKET = 'medical-documents';
export const AVATARS_BUCKET = 'avatars';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });
  }

  async onModuleInit() {
    await this.ensureBucket(DOCUMENTS_BUCKET);
    await this.ensureBucket(AVATARS_BUCKET);
  }

  private async ensureBucket(bucket: string) {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket);
        this.logger.log(`Bucket "${bucket}" créé`);
      }
    } catch (err) {
      this.logger.warn(`Impossible de vérifier/créer le bucket "${bucket}": ${(err as Error).message}`);
    }
  }

  /**
   * Uploader un fichier depuis un Buffer
   */
  async uploadFile(
    bucket: string,
    objectKey: string,
    buffer: Buffer,
    mimeType: string,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    await this.client.putObject(
      bucket,
      objectKey,
      Readable.from(buffer),
      buffer.length,
      { 'Content-Type': mimeType, ...metadata },
    );
  }

  /**
   * Générer une URL présignée pour télécharger un fichier (lecture)
   * expiry: secondes (défaut 1h)
   */
  async getPresignedDownloadUrl(
    bucket: string,
    objectKey: string,
    expiry = 3600,
  ): Promise<string> {
    return this.client.presignedGetObject(bucket, objectKey, expiry);
  }

  /**
   * Générer une URL présignée pour uploader directement depuis le client (optionnel)
   */
  async getPresignedUploadUrl(
    bucket: string,
    objectKey: string,
    expiry = 3600,
  ): Promise<string> {
    return this.client.presignedPutObject(bucket, objectKey, expiry);
  }

  /**
   * Supprimer un fichier
   */
  async deleteFile(bucket: string, objectKey: string): Promise<void> {
    try {
      await this.client.removeObject(bucket, objectKey);
    } catch (err) {
      this.logger.warn(`Impossible de supprimer "${objectKey}" dans "${bucket}": ${(err as Error).message}`);
    }
  }

  /**
   * Vérifier si un fichier existe
   */
  async fileExists(bucket: string, objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Construire la clé d'objet pour un document médical
   * Format: documents/{userId}/{timestamp}-{originalName}
   */
  buildDocumentKey(userId: string, originalName: string): string {
    const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documents/${userId}/${Date.now()}-${sanitized}`;
  }

  /**
   * Construire la clé d'objet pour un avatar
   */
  buildAvatarKey(userId: string, ext: string): string {
    return `avatars/${userId}/avatar.${ext}`;
  }
}
