import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BeneficiariesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return (this.prisma as any).beneficiary.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(userId: string, data: { firstName: string; lastName: string; relationship: string; birthDate?: string; phone?: string }) {
    return (this.prisma as any).beneficiary.create({
      data: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        relationship: data.relationship,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        phone: data.phone ?? null,
      },
    });
  }

  async update(id: string, userId: string, data: Partial<{ firstName: string; lastName: string; relationship: string; birthDate: string; phone: string }>) {
    await this.assertOwner(id, userId);
    return (this.prisma as any).beneficiary.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);
    return (this.prisma as any).beneficiary.delete({ where: { id } });
  }

  private async assertOwner(id: string, userId: string) {
    const b = await (this.prisma as any).beneficiary.findUnique({ where: { id } });
    if (!b) throw new NotFoundException('Proche introuvable');
    if (b.userId !== userId) throw new ForbiddenException();
  }
}
