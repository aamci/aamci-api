import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreatePrescriptionTemplateDto,
  UpdatePrescriptionTemplateDto,
} from './dto/create-prescription-template.dto';

@Injectable()
export class PrescriptionTemplatesService {
  constructor(private prisma: PrismaService) {}

  async getTemplates(doctorId: string, category?: string) {
    const where: any = { doctorId };

    if (category) {
      where.category = category;
    }

    return this.prisma.prescriptionTemplate.findMany({
      where,
      include: {
        medications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [
        { isFavorite: 'desc' },
        { usageCount: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async getFavoriteTemplates(doctorId: string) {
    return this.prisma.prescriptionTemplate.findMany({
      where: {
        doctorId,
        isFavorite: true,
      },
      include: {
        medications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { usageCount: 'desc' },
    });
  }

  async getTemplate(doctorId: string, templateId: string) {
    const template = await this.prisma.prescriptionTemplate.findUnique({
      where: { id: templateId },
      include: {
        medications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.doctorId !== doctorId) {
      throw new ForbiddenException('You do not have access to this template');
    }

    return template;
  }

  async createTemplate(doctorId: string, createDto: CreatePrescriptionTemplateDto) {
    const { medications, ...templateData } = createDto;

    const template = await this.prisma.prescriptionTemplate.create({
      data: {
        doctorId,
        ...templateData,
        medications: {
          create: medications.map((med, index) => ({
            ...med,
            sortOrder: med.sortOrder ?? index,
          })),
        },
      },
      include: {
        medications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return template;
  }

  async updateTemplate(
    doctorId: string,
    templateId: string,
    updateDto: UpdatePrescriptionTemplateDto,
  ) {
    await this.getTemplate(doctorId, templateId);

    const { medications, ...templateData } = updateDto;

    // If medications are provided, delete existing and create new ones
    if (medications) {
      await this.prisma.prescriptionTemplateMedication.deleteMany({
        where: { templateId },
      });
    }

    return this.prisma.prescriptionTemplate.update({
      where: { id: templateId },
      data: {
        ...templateData,
        ...(medications && {
          medications: {
            create: medications.map((med, index) => ({
              ...med,
              sortOrder: med.sortOrder ?? index,
            })),
          },
        }),
      },
      include: {
        medications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async deleteTemplate(doctorId: string, templateId: string) {
    await this.getTemplate(doctorId, templateId);

    await this.prisma.prescriptionTemplate.delete({
      where: { id: templateId },
    });

    return { message: 'Template deleted successfully' };
  }

  async toggleFavorite(doctorId: string, templateId: string) {
    const template = await this.getTemplate(doctorId, templateId);

    return this.prisma.prescriptionTemplate.update({
      where: { id: templateId },
      data: {
        isFavorite: !template.isFavorite,
      },
    });
  }

  async duplicateTemplate(doctorId: string, templateId: string) {
    const original = await this.getTemplate(doctorId, templateId);

    const duplicate = await this.prisma.prescriptionTemplate.create({
      data: {
        doctorId,
        name: `${original.name} (copie)`,
        description: original.description,
        category: original.category,
        notes: original.notes,
        isFavorite: false,
        usageCount: 0,
        medications: {
          create: original.medications.map((med) => ({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            sortOrder: med.sortOrder,
          })),
        },
      },
      include: {
        medications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return duplicate;
  }

  async useTemplate(doctorId: string, templateId: string) {
    await this.getTemplate(doctorId, templateId);

    // Increment usage count and update last used
    return this.prisma.prescriptionTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      include: {
        medications: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async getCategories(doctorId: string) {
    const templates = await this.prisma.prescriptionTemplate.findMany({
      where: { doctorId },
      select: { category: true },
      distinct: ['category'],
    });

    return templates.map((t) => t.category);
  }

  async getStats(doctorId: string) {
    const [total, byCategory, mostUsed] = await Promise.all([
      this.prisma.prescriptionTemplate.count({
        where: { doctorId },
      }),
      this.prisma.prescriptionTemplate.groupBy({
        by: ['category'],
        where: { doctorId },
        _count: true,
      }),
      this.prisma.prescriptionTemplate.findMany({
        where: { doctorId },
        orderBy: { usageCount: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          usageCount: true,
        },
      }),
    ]);

    return {
      total,
      byCategory: byCategory.reduce(
        (acc, item) => {
          acc[item.category] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      mostUsed,
    };
  }
}
