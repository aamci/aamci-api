import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  /**
   * GET /favorites - Récupérer tous mes médecins favoris
   */
  @Get()
  async getMyFavorites(@Req() req) {
    const patientId = req.user.userId;
    return this.favoritesService.getFavorites(patientId);
  }

  /**
   * GET /favorites/check/:doctorId - Vérifier si un médecin est en favori
   */
  @Get('check/:doctorId')
  async checkFavorite(@Req() req, @Param('doctorId') doctorId: string) {
    const patientId = req.user.userId;
    return this.favoritesService.isFavorite(patientId, doctorId);
  }

  /**
   * POST /favorites/:doctorId - Ajouter un médecin aux favoris
   */
  @Post(':doctorId')
  async addFavorite(@Req() req, @Param('doctorId') doctorId: string) {
    const patientId = req.user.userId;
    return this.favoritesService.addFavorite(patientId, doctorId);
  }

  /**
   * DELETE /favorites/:doctorId - Retirer un médecin des favoris
   */
  @Delete(':doctorId')
  async removeFavorite(@Req() req, @Param('doctorId') doctorId: string) {
    const patientId = req.user.userId;
    return this.favoritesService.removeFavorite(patientId, doctorId);
  }

  /**
   * POST /favorites/:doctorId/toggle - Basculer le statut favori
   */
  @Post(':doctorId/toggle')
  async toggleFavorite(@Req() req, @Param('doctorId') doctorId: string) {
    const patientId = req.user.userId;
    return this.favoritesService.toggleFavorite(patientId, doctorId);
  }

  /**
   * GET /favorites/count/:doctorId - Obtenir le nombre de favoris d'un médecin (public)
   */
  @Get('count/:doctorId')
  async getFavoriteCount(@Param('doctorId') doctorId: string) {
    return this.favoritesService.getFavoriteCount(doctorId);
  }
}
