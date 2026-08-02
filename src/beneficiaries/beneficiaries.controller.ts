import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(private readonly svc: BeneficiariesService) {}

  @Get()
  findAll(@Req() req) {
    return this.svc.findAll(req.user.userId);
  }

  @Post()
  create(@Req() req, @Body() body: any) {
    return this.svc.create(req.user.userId, body);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, req.user.userId, body);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.svc.remove(id, req.user.userId);
  }
}
