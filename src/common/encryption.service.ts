import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Service de chiffrement pour les données sensibles
 * Utilise AES-256-GCM pour un chiffrement fort et authentifié
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltLength = 64;

  /**
   * Récupère la clé de chiffrement depuis les variables d'environnement
   * IMPORTANT: Cette clé doit être stockée de manière sécurisée (ex: AWS Secrets Manager, Azure Key Vault)
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY must be set in environment variables');
    }
    // La clé doit être en base64 et faire 32 bytes (256 bits)
    return Buffer.from(key, 'base64');
  }

  /**
   * Génère une clé de chiffrement aléatoire (à utiliser une seule fois lors de la configuration)
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Chiffre une chaîne de caractères
   * @param text - Texte à chiffrer
   * @returns Texte chiffré au format base64 avec IV et tag d'authentification
   */
  encrypt(text: string): string {
    if (!text) return text;

    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    // On combine l'IV, le tag d'authentification et les données chiffrées
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
  }

  /**
   * Déchiffre une chaîne de caractères
   * @param encryptedText - Texte chiffré au format iv:tag:encrypted
   * @returns Texte déchiffré
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;

    try {
      const key = this.getEncryptionKey();
      const parts = encryptedText.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const tag = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed - data may be corrupted or key is wrong');
    }
  }

  /**
   * Hash une donnée de manière irréversible (pour les numéros de sécurité sociale, etc.)
   * @param text - Texte à hasher
   * @returns Hash SHA-256 en hexadécimal
   */
  hash(text: string): string {
    if (!text) return text;
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Hash avec salt pour éviter les rainbow tables
   * Utile pour les données qu'on veut pouvoir comparer sans déchiffrer
   */
  hashWithSalt(text: string): string {
    if (!text) return text;

    const salt = crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(text, salt, 100000, 64, 'sha512');

    // Format: salt:hash
    return `${salt.toString('base64')}:${hash.toString('base64')}`;
  }

  /**
   * Vérifie si un texte correspond à un hash avec salt
   */
  verifyHash(text: string, hashedText: string): boolean {
    if (!text || !hashedText) return false;

    const parts = hashedText.split(':');
    if (parts.length !== 2) return false;

    const salt = Buffer.from(parts[0], 'base64');
    const originalHash = parts[1];

    const hash = crypto.pbkdf2Sync(text, salt, 100000, 64, 'sha512');
    return hash.toString('base64') === originalHash;
  }
}
