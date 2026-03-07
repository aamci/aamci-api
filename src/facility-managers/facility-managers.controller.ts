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
import { FacilityManagersService } from './facility-managers.service';
import { CreateFacilityManagerDto } from './dto/create-facility-manager.dto';
import { UpdateFacilityManagerDto } from './dto/update-facility-manager.dto';
import { AssignDoctorDto } from './dto/assign-doctor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('facility-managers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilityManagersController {
  constructor(private readonly facilityManagersService: FacilityManagersService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createFacilityManagerDto: CreateFacilityManagerDto) {
    return this.facilityManagersService.create(createFacilityManagerDto);
  }

  @Get('me')
  @Roles('FACILITY_MANAGER')
  findMe(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.facilityManagersService.findOne(userId);
  }

  @Get('me/doctors')
  @Roles('FACILITY_MANAGER')
  getManagedDoctors(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.facilityManagersService.getManagedDoctors(userId);
  }

  @Get('me/finances')
  @Roles('FACILITY_MANAGER')
  getFinances(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.facilityManagersService.getFacilityFinances(userId);
  }

  @Get(':userId')
  @Roles('ADMIN')
  findOne(@Param('userId') userId: string) {
    return this.facilityManagersService.findOne(userId);
  }

  @Patch(':userId')
  @Roles('ADMIN')
  update(
    @Param('userId') userId: string,
    @Body() updateFacilityManagerDto: UpdateFacilityManagerDto,
  ) {
    return this.facilityManagersService.update(userId, updateFacilityManagerDto);
  }

  @Post('me/doctors')
  @Roles('FACILITY_MANAGER', 'ADMIN')
  assignDoctor(@Req() req: any, @Body() assignDoctorDto: AssignDoctorDto) {
    const userId = req.user?.userId || req.user?.sub;
    return this.facilityManagersService.assignDoctor(
      userId,
      assignDoctorDto.doctorId,
    );
  }

  @Delete('me/doctors/:doctorId')
  @Roles('FACILITY_MANAGER', 'ADMIN')
  removeDoctor(@Req() req: any, @Param('doctorId') doctorId: string) {
    const userId = req.user?.userId || req.user?.sub;
    return this.facilityManagersService.removeDoctor(userId, doctorId);
  }
}
