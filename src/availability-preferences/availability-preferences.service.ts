import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { ApplyPreferenceDto } from './dto/apply-preference.dto';

@Injectable()
export class AvailabilityPreferencesService {
  constructor(private prisma: PrismaService) {}

  async create(
    ownerId: string,
    ownerType: string,
    dto: CreatePreferenceDto,
  ) {
    // Vérifier la limite de 3 preferences par utilisateur
    const count = await this.prisma.availabilityPreference.count({
      where: { ownerId, ownerType },
    });

    if (count >= 3) {
      throw new BadRequestException(
        'Maximum 3 preferences allowed per user',
      );
    }

    // Si cette préférence est marquée comme défaut, désactiver les autres
    if (dto.isDefault) {
      await this.prisma.availabilityPreference.updateMany({
        where: { ownerId, ownerType, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.availabilityPreference.create({
      data: {
        ownerId,
        ownerType,
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault || false,
        daysOfWeek: dto.daysOfWeek,
        startHour: dto.startHour,
        endHour: dto.endHour,
        slotDurationMins: dto.slotDurationMins,
        capacity: dto.capacity || 1,
        allowedKindIds: dto.allowedKindIds || [],
        excludedTimes: dto.excludedTimes || [],
        minBookingNotice: dto.minBookingNotice,
        maxBookingAdvance: dto.maxBookingAdvance,
        autoConfirm: dto.autoConfirm ?? true,
        allowCancellation: dto.allowCancellation ?? true,
        cancellationDeadline: dto.cancellationDeadline,
      },
    });
  }

  async findAllByOwner(ownerId: string, ownerType: string) {
    return this.prisma.availabilityPreference.findMany({
      where: { ownerId, ownerType },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findAll(ownerId: string) {
    return this.prisma.availabilityPreference.findMany({
      where: { ownerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, ownerId: string) {
    const preference = await this.prisma.availabilityPreference.findFirst({
      where: { id, ownerId },
    });

    if (!preference) {
      throw new NotFoundException('Preference not found');
    }

    return preference;
  }

  async update(id: string, ownerId: string, dto: UpdatePreferenceDto) {
    const preference = await this.findOne(id, ownerId);

    // Si cette préférence est marquée comme défaut, désactiver les autres
    if (dto.isDefault) {
      await this.prisma.availabilityPreference.updateMany({
        where: {
          ownerId: preference.ownerId,
          ownerType: preference.ownerType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.availabilityPreference.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault,
        daysOfWeek: dto.daysOfWeek,
        startHour: dto.startHour,
        endHour: dto.endHour,
        slotDurationMins: dto.slotDurationMins,
        capacity: dto.capacity,
        allowedKindIds: dto.allowedKindIds,
        excludedTimes: dto.excludedTimes,
        minBookingNotice: dto.minBookingNotice,
        maxBookingAdvance: dto.maxBookingAdvance,
        autoConfirm: dto.autoConfirm,
        allowCancellation: dto.allowCancellation,
        cancellationDeadline: dto.cancellationDeadline,
      },
    });
  }

  async remove(id: string, ownerId: string) {
    await this.findOne(id, ownerId);

    return this.prisma.availabilityPreference.delete({
      where: { id },
    });
  }

  async setDefault(id: string, ownerId: string) {
    const preference = await this.findOne(id, ownerId);

    // Désactiver toutes les autres préférences par défaut
    await this.prisma.availabilityPreference.updateMany({
      where: {
        ownerId: preference.ownerId,
        ownerType: preference.ownerType,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Activer celle-ci
    return this.prisma.availabilityPreference.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async applyPreference(
    preferenceId: string,
    ownerId: string,
    dto: ApplyPreferenceDto,
  ) {
    const preference = await this.findOne(preferenceId, ownerId);

    // Déterminer le doctorId cible
    let targetDoctorId = ownerId;
    if (dto.doctorId) {
      targetDoctorId = dto.doctorId;
    }

    // Créer une AvailabilityRule basée sur cette préférence
    const rule = await this.prisma.availabilityRule.create({
      data: {
        ownerId: targetDoctorId,
        ownerType: 'DOCTOR',
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        daysOfWeek: preference.daysOfWeek,
        startHour: preference.startHour,
        endHour: preference.endHour,
        slotDurationMins: preference.slotDurationMins,
        capacity: preference.capacity,
        allowedKindIds: preference.allowedKindIds,
        excludedTimes: preference.excludedTimes,
        minBookingNotice: preference.minBookingNotice,
        maxBookingAdvance: preference.maxBookingAdvance,
        autoConfirm: preference.autoConfirm,
        allowCancellation: preference.allowCancellation,
        cancellationDeadline: preference.cancellationDeadline,
      },
    });

    return rule;
  }
}
