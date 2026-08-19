import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BlocksService {
  constructor(private prisma: PrismaService) {}

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new ConflictException('Impossible de se bloquer soi-même');

    const target = await this.prisma.user.findUnique({ where: { id: blockedId } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    return this.prisma.block.upsert({
      where:  { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({ where: { blockerId, blockedId } });
    return { success: true };
  }

  async listBlocked(blockerId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId },
      include: {
        blocked: {
          select: { id: true, fullName: true, avatarUrl: true, role: true,
                    doctorProfile: { select: { specialty: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return blocks.map(b => ({ ...b.blocked, blockedAt: b.createdAt }));
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const b = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    return !!b;
  }

  async eitherBlocked(userA: string, userB: string): Promise<boolean> {
    const count = await this.prisma.block.count({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return count > 0;
  }
}
