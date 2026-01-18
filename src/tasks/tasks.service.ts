import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // Liste des tâches pour un médecin
  async listForDoctor(
    doctorId: string,
    filters?: {
      status?: string;
      priority?: string;
      category?: string;
      patientId?: string;
      dueBefore?: string;
      dueAfter?: string;
    },
  ) {
    const where: any = { doctorId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters?.dueBefore || filters?.dueAfter) {
      where.dueDate = {};
      if (filters.dueBefore) {
        where.dueDate.lte = new Date(filters.dueBefore);
      }
      if (filters.dueAfter) {
        where.dueDate.gte = new Date(filters.dueAfter);
      }
    }

    return this.prisma.task.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // Récupérer une tâche par ID
  async findById(taskId: string, doctorId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tâche non trouvée');
    }

    if (task.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé à cette tâche');
    }

    return task;
  }

  // Créer une nouvelle tâche
  async create(
    doctorId: string,
    dto: {
      title: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      category?: 'FOLLOW_UP' | 'CALL' | 'PRESCRIPTION' | 'LAB_REVIEW' | 'ADMIN' | 'APPOINTMENT' | 'OTHER';
      patientId?: string;
      dueDate?: string;
      reminderAt?: string;
      tags?: string[];
    },
  ) {
    // Vérifier que le patient existe si spécifié
    if (dto.patientId) {
      const patient = await this.prisma.user.findUnique({
        where: { id: dto.patientId },
      });
      if (!patient) {
        throw new NotFoundException('Patient non trouvé');
      }
    }

    return this.prisma.task.create({
      data: {
        doctorId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        category: dto.category || 'OTHER',
        patientId: dto.patientId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
        tags: dto.tags || [],
        status: 'TODO',
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  // Mettre à jour une tâche
  async update(
    taskId: string,
    doctorId: string,
    dto: {
      title?: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      category?: 'FOLLOW_UP' | 'CALL' | 'PRESCRIPTION' | 'LAB_REVIEW' | 'ADMIN' | 'APPOINTMENT' | 'OTHER';
      status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
      patientId?: string | null;
      dueDate?: string | null;
      reminderAt?: string | null;
      tags?: string[];
    },
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Tâche non trouvée');
    }

    if (task.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    if (dto.patientId !== undefined) {
      updateData.patientId = dto.patientId;
    }

    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.reminderAt !== undefined) {
      updateData.reminderAt = dto.reminderAt ? new Date(dto.reminderAt) : null;
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'DONE') {
        updateData.completedAt = new Date();
      } else if (task.status === 'DONE') {
        // Réouvrir une tâche terminée - effacer la date de complétion
        updateData.completedAt = null;
      }
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  // Marquer une tâche comme terminée
  async markAsDone(taskId: string, doctorId: string) {
    return this.update(taskId, doctorId, { status: 'DONE' });
  }

  // Supprimer une tâche
  async delete(taskId: string, doctorId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Tâche non trouvée');
    }

    if (task.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    return this.prisma.task.delete({
      where: { id: taskId },
    });
  }

  // Statistiques des tâches
  async getStats(doctorId: string) {
    const [total, todo, inProgress, done, overdue, urgent, todayDue] = await Promise.all([
      this.prisma.task.count({ where: { doctorId } }),
      this.prisma.task.count({ where: { doctorId, status: 'TODO' } }),
      this.prisma.task.count({ where: { doctorId, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { doctorId, status: 'DONE' } }),
      this.prisma.task.count({
        where: {
          doctorId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.task.count({
        where: {
          doctorId,
          priority: 'URGENT',
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.task.count({
        where: {
          doctorId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      total,
      todo,
      inProgress,
      done,
      overdue,
      urgent,
      todayDue,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }

  // Tâches à rappeler
  async getReminders(doctorId: string) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.task.findMany({
      where: {
        doctorId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        reminderAt: {
          gte: now,
          lte: tomorrow,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { reminderAt: 'asc' },
    });
  }
}
