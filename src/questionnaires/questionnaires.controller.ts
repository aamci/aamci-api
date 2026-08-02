import {
  Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import { JwtAuthGuard } from '../common/jwt.guard';

@Controller('questionnaires')
export class QuestionnairesController {
  constructor(private readonly svc: QuestionnairesService) {}

  // ── Doctor: manage questionnaires ──────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: { title: string; description?: string }) {
    return this.svc.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req) {
    return this.svc.findAllByDoctor(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: any) {
    return this.svc.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.svc.remove(id, req.user.userId);
  }

  // ── Questions ──────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(':id/questions')
  addQuestion(@Param('id') id: string, @Req() req, @Body() dto: any) {
    return this.svc.addQuestion(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('questions/:questionId')
  updateQuestion(@Param('questionId') questionId: string, @Req() req, @Body() dto: any) {
    return this.svc.updateQuestion(questionId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('questions/:questionId')
  removeQuestion(@Param('questionId') questionId: string, @Req() req) {
    return this.svc.removeQuestion(questionId, req.user.userId);
  }

  // ── Link to AppointmentKind ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post(':id/link-kind/:kindId')
  linkToKind(@Param('id') id: string, @Param('kindId') kindId: string, @Req() req) {
    return this.svc.linkToKind(id, kindId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('unlink-kind/:kindId')
  unlinkFromKind(@Param('kindId') kindId: string, @Req() req) {
    return this.svc.unlinkFromKind(kindId, req.user.userId);
  }

  // ── Patient: submit response ───────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('responses/:appointmentId')
  submitResponse(
    @Param('appointmentId') appointmentId: string,
    @Req() req,
    @Body() dto: { questionnaireId: string; answers: Record<string, any> },
  ) {
    return this.svc.submitResponse(appointmentId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('responses/:appointmentId')
  getResponse(@Param('appointmentId') appointmentId: string) {
    return this.svc.getResponse(appointmentId);
  }

  // ── Public: get questionnaire for a kind ──────────────────────────────────

  @Get('for-kind/:kindId')
  findForKind(@Param('kindId') kindId: string) {
    return this.svc.findForKind(kindId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }
}
