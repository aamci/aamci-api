import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class QuestionnairesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(doctorId: string, dto: { title: string; description?: string }) {
    return (this.prisma as any).questionnaire.create({
      data: { doctorId, title: dto.title, description: dto.description },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async findAllByDoctor(doctorId: string) {
    return (this.prisma as any).questionnaire.findMany({
      where: { doctorId },
      include: { questions: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const q = await (this.prisma as any).questionnaire.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!q) throw new NotFoundException('Questionnaire introuvable');
    return q;
  }

  // Public: fetch questionnaire for a specific appointment kind
  async findForKind(kindId: string) {
    const kind = await (this.prisma as any).appointmentKind.findUnique({
      where: { id: kindId },
      include: {
        questionnaire: {
          include: { questions: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!kind) throw new NotFoundException('Type de consultation introuvable');
    if (!kind.questionnaire || !kind.questionnaire.isActive) return null;
    return kind.questionnaire;
  }

  async update(id: string, doctorId: string, dto: { title?: string; description?: string; isActive?: boolean }) {
    const q = await (this.prisma as any).questionnaire.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Questionnaire introuvable');
    if (q.doctorId !== doctorId) throw new ForbiddenException('Accès refusé');
    return (this.prisma as any).questionnaire.update({
      where: { id },
      data: dto,
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async remove(id: string, doctorId: string) {
    const q = await (this.prisma as any).questionnaire.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Questionnaire introuvable');
    if (q.doctorId !== doctorId) throw new ForbiddenException('Accès refusé');
    await (this.prisma as any).questionnaire.delete({ where: { id } });
    return { success: true };
  }

  async addQuestion(questionnaireId: string, doctorId: string, dto: {
    text: string;
    type?: string;
    options?: string[];
    required?: boolean;
    order?: number;
  }) {
    const q = await (this.prisma as any).questionnaire.findUnique({ where: { id: questionnaireId } });
    if (!q) throw new NotFoundException('Questionnaire introuvable');
    if (q.doctorId !== doctorId) throw new ForbiddenException('Accès refusé');

    // Auto-set order if not provided
    let order = dto.order;
    if (order === undefined) {
      const last = await (this.prisma as any).question.findFirst({
        where: { questionnaireId },
        orderBy: { order: 'desc' },
      });
      order = (last?.order ?? -1) + 1;
    }

    return (this.prisma as any).question.create({
      data: {
        questionnaireId,
        text: dto.text,
        type: dto.type || 'TEXT',
        options: dto.options ? JSON.stringify(dto.options) : null,
        required: dto.required ?? false,
        order,
      },
    });
  }

  async updateQuestion(questionId: string, doctorId: string, dto: {
    text?: string;
    type?: string;
    options?: string[];
    required?: boolean;
    order?: number;
  }) {
    const question = await (this.prisma as any).question.findUnique({
      where: { id: questionId },
      include: { questionnaire: true },
    });
    if (!question) throw new NotFoundException('Question introuvable');
    if (question.questionnaire.doctorId !== doctorId) throw new ForbiddenException('Accès refusé');

    return (this.prisma as any).question.update({
      where: { id: questionId },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.options !== undefined && { options: JSON.stringify(dto.options) }),
        ...(dto.required !== undefined && { required: dto.required }),
        ...(dto.order !== undefined && { order: dto.order }),
      },
    });
  }

  async removeQuestion(questionId: string, doctorId: string) {
    const question = await (this.prisma as any).question.findUnique({
      where: { id: questionId },
      include: { questionnaire: true },
    });
    if (!question) throw new NotFoundException('Question introuvable');
    if (question.questionnaire.doctorId !== doctorId) throw new ForbiddenException('Accès refusé');
    await (this.prisma as any).question.delete({ where: { id: questionId } });
    return { success: true };
  }

  // Attach/detach questionnaire to an AppointmentKind
  async linkToKind(questionnaireId: string, kindId: string, doctorId: string) {
    const q = await (this.prisma as any).questionnaire.findUnique({ where: { id: questionnaireId } });
    if (!q) throw new NotFoundException('Questionnaire introuvable');
    if (q.doctorId !== doctorId) throw new ForbiddenException('Accès refusé');

    return (this.prisma as any).appointmentKind.update({
      where: { id: kindId },
      data: { questionnaireId },
    });
  }

  async unlinkFromKind(kindId: string, doctorId: string) {
    return (this.prisma as any).appointmentKind.update({
      where: { id: kindId },
      data: { questionnaireId: null },
    });
  }

  // Patient submits questionnaire response
  async submitResponse(appointmentId: string, patientId: string, dto: {
    questionnaireId: string;
    answers: Record<string, string | string[]>;
  }) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Rendez-vous introuvable');
    if (appt.patientId !== patientId) throw new ForbiddenException('Accès refusé');

    return (this.prisma as any).questionnaireResponse.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        questionnaireId: dto.questionnaireId,
        answers: dto.answers,
      },
      update: {
        answers: dto.answers,
        submittedAt: new Date(),
      },
    });
  }

  // Doctor reads questionnaire response for an appointment
  async getResponse(appointmentId: string) {
    return (this.prisma as any).questionnaireResponse.findUnique({
      where: { appointmentId },
      include: {
        questionnaire: { include: { questions: { orderBy: { order: 'asc' } } } },
      },
    });
  }
}
