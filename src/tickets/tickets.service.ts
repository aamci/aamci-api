import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, body: {
    title: string;
    description: string;
    category?: string;
    priority?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const authorType = user.role === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';

    return this.prisma.supportTicket.create({
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        priority: (body.priority as any) ?? 'MEDIUM',
        authorType,
        authorId: userId,
      },
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        response: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
