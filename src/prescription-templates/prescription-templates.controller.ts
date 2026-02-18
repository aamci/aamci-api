import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePrescriptionTemplateDto,
  UpdatePrescriptionTemplateDto,
} from './dto/create-prescription-template.dto';

@Controller('prescription-templates')
@UseGuards(JwtAuthGuard)
export class PrescriptionTemplatesController {
  constructor(
    private readonly prescriptionTemplatesService: PrescriptionTemplatesService,
  ) {}

  @Get()
  getTemplates(@Request() req, @Query('category') category?: string) {
    return this.prescriptionTemplatesService.getTemplates(req.user.userId, category);
  }

  @Get('favorites')
  getFavoriteTemplates(@Request() req) {
    return this.prescriptionTemplatesService.getFavoriteTemplates(req.user.userId);
  }

  @Get('categories')
  getCategories(@Request() req) {
    return this.prescriptionTemplatesService.getCategories(req.user.userId);
  }

  @Get('stats')
  getStats(@Request() req) {
    return this.prescriptionTemplatesService.getStats(req.user.userId);
  }

  @Get(':id')
  getTemplate(@Request() req, @Param('id') id: string) {
    return this.prescriptionTemplatesService.getTemplate(req.user.userId, id);
  }

  @Post()
  createTemplate(@Request() req, @Body() createDto: CreatePrescriptionTemplateDto) {
    return this.prescriptionTemplatesService.createTemplate(req.user.userId, createDto);
  }

  @Put(':id')
  updateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdatePrescriptionTemplateDto,
  ) {
    return this.prescriptionTemplatesService.updateTemplate(
      req.user.userId,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  deleteTemplate(@Request() req, @Param('id') id: string) {
    return this.prescriptionTemplatesService.deleteTemplate(req.user.userId, id);
  }

  @Post(':id/toggle-favorite')
  toggleFavorite(@Request() req, @Param('id') id: string) {
    return this.prescriptionTemplatesService.toggleFavorite(req.user.userId, id);
  }

  @Post(':id/duplicate')
  duplicateTemplate(@Request() req, @Param('id') id: string) {
    return this.prescriptionTemplatesService.duplicateTemplate(req.user.userId, id);
  }

  @Post(':id/use')
  useTemplate(@Request() req, @Param('id') id: string) {
    return this.prescriptionTemplatesService.useTemplate(req.user.userId, id);
  }
}
