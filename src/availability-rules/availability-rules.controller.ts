import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AvailabilityRulesService } from './availability-rules.service';
import { CreateAvailabilityRuleDto } from './dto/create-availability-rule.dto';
import { UpdateAvailabilityRuleDto } from './dto/update-availability-rule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FacilityManagersService } from '../facility-managers/facility-managers.service';

@Controller('availability-rules')
@UseGuards(JwtAuthGuard)
export class AvailabilityRulesController {
  constructor(
    private readonly service: AvailabilityRulesService,
    private readonly facilityManagersService: FacilityManagersService,
  ) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateAvailabilityRuleDto) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    let ownerType: string;
    let targetDoctorId: string;

    if (req.user.role === 'FACILITY_MANAGER') {
      // FACILITY_MANAGER doit spécifier un doctorId
      if (!dto.doctorId) {
        throw new BadRequestException('doctorId required for FACILITY_MANAGER');
      }

      // Vérifier que le gestionnaire peut gérer ce docteur
      const canManage = await this.facilityManagersService.canManageDoctor(
        userId,
        dto.doctorId,
      );

      if (!canManage) {
        throw new ForbiddenException('Cannot manage this doctor');
      }

      ownerType = 'DOCTOR';
      targetDoctorId = dto.doctorId;
    } else if (req.user.role === 'HOSPITAL') {
      ownerType = 'HOSPITAL';
      targetDoctorId = userId;
    } else if (req.user.role === 'DOCTOR') {
      ownerType = 'DOCTOR';
      targetDoctorId = userId;
    } else {
      throw new ForbiddenException('Invalid role for this operation');
    }

    return this.service.create(targetDoctorId, ownerType, dto);
  }

  @Get('mine')
  async findMine(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.findAllByOwner(userId);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.findOne(id, userId);
  }

  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityRuleDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.update(id, userId, dto);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.remove(id, userId);
  }
}
