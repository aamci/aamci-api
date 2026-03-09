import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * Module global — StorageService disponible dans toute l'application
 * sans avoir à l'importer explicitement dans chaque module.
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
