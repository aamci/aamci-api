import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { DoctorAbsencesService } from './doctor-absences.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('doctor-absences')
@UseGuards(JwtAuthGuard)
export class DoctorAbsencesController {
  constructor(private readonly service: DoctorAbsencesService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateAbsenceDto) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.create(userId, dto);
  }

  @Get('mine')
  async findMine(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('User not authenticated');

    return this.service.findAllByDoctor(userId);
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
    @Body() dto: UpdateAbsenceDto,
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
