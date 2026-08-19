import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(reporterId: string, dto: {
    targetId: string;
    type: string;
    reason: string;
    details?: string;
    conversationId?: string;
  }) {
    const target = await this.prisma.user.findUnique({ where: { id: dto.targetId } });
    if (!target) throw new NotFoundException('Utilisateur cible introuvable');

    return this.prisma.report.create({
      data: {
        reporterId,
        targetId: dto.targetId,
        type:   dto.type   as any,
        reason: dto.reason as any,
        details: dto.details,
        conversationId: dto.conversationId,
      },
    });
  }

  async listAll(filters: { status?: string; page?: number; limit?: number }) {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where = filters.status ? { status: filters.status as any } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
          target:   { select: { id: true, fullName: true, email: true, role: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, total, page, limit };
  }

  async updateStatus(id: string, adminId: string, status: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Signalement introuvable');

    return this.prisma.report.update({
      where: { id },
      data: {
        status:     status as any,
        resolvedAt: status !== 'PENDING' ? new Date() : null,
        resolvedBy: status !== 'PENDING' ? adminId    : null,
      },
    });
  }
}
