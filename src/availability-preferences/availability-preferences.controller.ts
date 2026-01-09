import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AvailabilityPreferencesService } from './availability-preferences.service';
import { CreatePreferenceDto } from './dto/create-preference.dto';
import { UpdatePreferenceDto } from './dto/update-preference.dto';
import { ApplyPreferenceDto } from './dto/apply-preference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('availability-preferences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityPreferencesController {
  constructor(
    private readonly availabilityPreferencesService: AvailabilityPreferencesService,
  ) {}

  @Post()
  @Roles('DOCTOR', 'FACILITY_MANAGER')
  create(@Req() req: any, @Body() createPreferenceDto: CreatePreferenceDto) {
    const userId = req.user?.userId || req.user?.sub;
    const ownerType = req.user.role;
    return this.availabilityPreferencesService.create(
      userId,
      ownerType,
      createPreferenceDto,
    );
  }

  @Get()
  @Roles('DOCTOR', 'FACILITY_MANAGER')
  findAll(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    const ownerType = req.user.role;
    return this.availabilityPreferencesService.findAllByOwner(
      userId,
      ownerType,
    );
  }

  @Get(':id')
  @Roles('DOCTOR', 'FACILITY_MANAGER')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.availabilityPreferencesService.findOne(id, req.user?.userId || req.user?.sub);
  }

  @Patch(':id')
  @Roles('DOCTOR', 'FACILITY_MANAGER')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updatePreferenceDto: UpdatePreferenceDto,
  ) {
    return this.availabilityPreferencesService.update(
      id,
      req.user?.userId || req.user?.sub,
      updatePreferenceDto,
    );
  }

  @Delete(':id')
  @Roles('DOCTOR', 'FACILITY_MANAGER')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.availabilityPreferencesService.remove(id, req.user?.userId || req.user?.sub);
  }

  @Post(':id/set-default')
  @Roles('DOCTOR', 'FACILITY_MANAGER')
  setDefault(@Req() req: any, @Param('id') id: string) {
    return this.availabilityPreferencesService.setDefault(id, req.user?.userId || req.user?.sub);
  }

  @Post(':id/apply')
  @Roles('DOCTOR', 'FACILITY_MANAGER')
  applyPreference(
    @Req() req: any,
    @Param('id') id: string,
    @Body() applyPreferenceDto: ApplyPreferenceDto,
  ) {
    return this.availabilityPreferencesService.applyPreference(
      id,
      req.user?.userId || req.user?.sub,
      applyPreferenceDto,
    );
  }
}
