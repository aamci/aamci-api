import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';
import { UpdateAvailabilityRuleDto } from './dto/update-availability-rule.dto';

@Injectable()
export class AvailabilityRulesService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, ownerType: string, dto: CreateAvailabilityRuleDto) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (dto.startHour >= dto.endHour) {
      throw new BadRequestException('End hour must be after start hour');
    }

    if (dto.daysOfWeek.length === 0) {
      throw new BadRequestException('At least one day of the week must be selected');
    }

    // Create the rule
    return this.prisma.availabilityRule.create({
      data: {
        ownerId,
        ownerType,
        startDate,
        endDate,
        daysOfWeek: dto.daysOfWeek,
        startHour: dto.startHour,
        endHour: dto.endHour,
        slotDurationMins: dto.slotDurationMins,
        capacity: dto.capacity,
        excludedTimes: dto.excludedTimes || [],
        status: 'ACTIVE',
      },
    });
  }

  async findAllByOwner(ownerId: string) {
    return this.prisma.availabilityRule.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ownerId: string) {
    const rule = await this.prisma.availabilityRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundException('Availability rule not found');
    }

    if (rule.ownerId !== ownerId) {
      throw new ForbiddenException('Not authorized to access this rule');
    }

    return rule;
  }

  async update(id: string, ownerId: string, dto: UpdateAvailabilityRuleDto) {
    // Check ownership
    const existingRule = await this.findOne(id, ownerId);

    // Validate dates if provided
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : existingRule.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : existingRule.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Validate hours if provided
    if (dto.startHour !== undefined || dto.endHour !== undefined) {
      const startHour = dto.startHour !== undefined ? dto.startHour : existingRule.startHour;
      const endHour = dto.endHour !== undefined ? dto.endHour : existingRule.endHour;

      if (startHour >= endHour) {
        throw new BadRequestException('End hour must be after start hour');
      }
    }

    // Update the rule
    const updateData: any = {};
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.daysOfWeek) updateData.daysOfWeek = dto.daysOfWeek;
    if (dto.startHour !== undefined) updateData.startHour = dto.startHour;
    if (dto.endHour !== undefined) updateData.endHour = dto.endHour;
    if (dto.slotDurationMins) updateData.slotDurationMins = dto.slotDurationMins;
    if (dto.capacity) updateData.capacity = dto.capacity;
    if (dto.excludedTimes) updateData.excludedTimes = dto.excludedTimes;
    if (dto.status) updateData.status = dto.status;

    return this.prisma.availabilityRule.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, ownerId: string) {
    // Check ownership
    await this.findOne(id, ownerId);

    return this.prisma.availabilityRule.delete({
      where: { id },
    });
  }

  /**
   * Find a rule that covers a specific date/time
   * Used when creating slots on-demand during booking
   */
  async findRuleCovering(ownerId: string, dateTime: Date) {
    const dayOfWeek = dateTime.getDay() === 0 ? 7 : dateTime.getDay();
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        ownerId,
        status: 'ACTIVE',
        startDate: { lte: dateTime },
        endDate: { gte: dateTime },
      },
    });

    // Find a rule that matches this day and time
    for (const rule of rules) {
      // Check if day matches
      if (!rule.daysOfWeek.includes(dayOfWeek)) continue;

      // Check if hour is within range
      if (hour < rule.startHour || hour >= rule.endHour) continue;

      // Check if time is not excluded
      let isExcluded = false;
      for (const range of rule.excludedTimes) {
        const [start, end] = range.split('-');
        if (timeStr >= start && timeStr < end) {
          isExcluded = true;
          break;
        }
      }

      if (!isExcluded) {
        return rule;
      }
    }

    return null;
  }
}
