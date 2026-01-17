import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ajouter un médecin aux favoris
   */
  async addFavorite(patientId: string, doctorId: string) {
    // Vérifier que le médecin existe et est bien un médecin
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new NotFoundException('Médecin non trouvé');
    }

    // Vérifier si déjà en favori
    const existing = await this.prisma.favoriteDoctor.findUnique({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Ce médecin est déjà dans vos favoris');
    }

    return this.prisma.favoriteDoctor.create({
      data: {
        patientId,
        doctorId,
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            doctorProfile: {
              select: {
                specialty: true,
                city: true,
                address: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retirer un médecin des favoris
   */
  async removeFavorite(patientId: string, doctorId: string) {
    const favorite = await this.prisma.favoriteDoctor.findUnique({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundException('Ce médecin n\'est pas dans vos favoris');
    }

    await this.prisma.favoriteDoctor.delete({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId,
        },
      },
    });

    return { success: true, message: 'Médecin retiré des favoris' };
  }

  /**
   * Récupérer la liste des médecins favoris d'un patient
   */
  async getFavorites(patientId: string) {
    const favorites = await this.prisma.favoriteDoctor.findMany({
      where: { patientId },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            phone: true,
            doctorProfile: {
              select: {
                specialty: true,
                city: true,
                address: true,
                presentation: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites.map((f) => ({
      id: f.id,
      addedAt: f.createdAt,
      doctor: f.doctor,
    }));
  }

  /**
   * Vérifier si un médecin est en favori
   */
  async isFavorite(patientId: string, doctorId: string) {
    const favorite = await this.prisma.favoriteDoctor.findUnique({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId,
        },
      },
    });

    return { isFavorite: !!favorite };
  }

  /**
   * Basculer le statut favori (ajouter/retirer)
   */
  async toggleFavorite(patientId: string, doctorId: string) {
    const existing = await this.prisma.favoriteDoctor.findUnique({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId,
        },
      },
    });

    if (existing) {
      await this.prisma.favoriteDoctor.delete({
        where: {
          patientId_doctorId: {
            patientId,
            doctorId,
          },
        },
      });
      return { isFavorite: false, message: 'Médecin retiré des favoris' };
    } else {
      // Vérifier que le médecin existe
      const doctor = await this.prisma.user.findUnique({
        where: { id: doctorId },
      });

      if (!doctor || doctor.role !== 'DOCTOR') {
        throw new NotFoundException('Médecin non trouvé');
      }

      await this.prisma.favoriteDoctor.create({
        data: {
          patientId,
          doctorId,
        },
      });
      return { isFavorite: true, message: 'Médecin ajouté aux favoris' };
    }
  }

  /**
   * Compter le nombre de favoris d'un médecin
   */
  async getFavoriteCount(doctorId: string) {
    const count = await this.prisma.favoriteDoctor.count({
      where: { doctorId },
    });

    return { count };
  }
}
