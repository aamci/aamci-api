import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { NoteType } from '@prisma/client';

@Injectable()
export class MedicalNotesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer une nouvelle note médicale (par un médecin)
   */
  async createNote(doctorId: string, data: {
    patientId: string;
    type?: NoteType;
    title?: string;
    content: string;
    appointmentId?: string;
    isPrivate?: boolean;
    tags?: string[];
  }) {
    // Vérifier que le patient existe
    const patient = await this.prisma.user.findUnique({
      where: { id: data.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient non trouvé');
    }

    // Si appointmentId fourni, vérifier qu'il appartient au médecin et au patient
    if (data.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: data.appointmentId,
          patientId: data.patientId,
          slot: {
            ownerId: doctorId,
          },
        },
      });

      if (!appointment) {
        throw new BadRequestException('Rendez-vous non trouvé ou non autorisé');
      }
    }

    return this.prisma.medicalNote.create({
      data: {
        patientId: data.patientId,
        doctorId,
        type: data.type || 'OBSERVATION',
        title: data.title,
        content: data.content,
        appointmentId: data.appointmentId,
        isPrivate: data.isPrivate ?? false,
        tags: data.tags || [],
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            createdAt: true,
            slot: {
              select: {
                start: true,
                end: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Récupérer les notes d'un patient (pour le médecin)
   */
  async getPatientNotes(patientId: string, doctorId: string, includePrivate: boolean = true) {
    // Vérifier que le médecin a des rendez-vous avec ce patient
    const hasAppointments = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        slot: {
          ownerId: doctorId,
        },
      },
    });

    if (!hasAppointments) {
      throw new ForbiddenException('Vous n\'avez pas de rendez-vous avec ce patient');
    }

    return this.prisma.medicalNote.findMany({
      where: {
        patientId,
        OR: includePrivate
          ? [
              { doctorId }, // Notes du médecin connecté (y compris privées)
              { isPrivate: false }, // Notes publiques des autres médecins
            ]
          : [{ isPrivate: false }],
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
        appointment: {
          select: {
            id: true,
            createdAt: true,
            slot: {
              select: {
                start: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupérer mes propres notes (pour le médecin)
   */
  async getMyNotes(doctorId: string, filters?: {
    patientId?: string;
    type?: NoteType;
    tags?: string[];
  }) {
    const where: any = { doctorId };

    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    return this.prisma.medicalNote.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            slot: {
              select: {
                start: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupérer une note par ID
   */
  async getNote(noteId: string, requesterId: string, requesterRole: string) {
    const note = await this.prisma.medicalNote.findUnique({
      where: { id: noteId },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        appointment: {
          select: {
            id: true,
            slot: {
              select: {
                start: true,
                end: true,
              },
            },
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Note non trouvée');
    }

    // Vérifier l'accès
    const isAuthor = note.doctorId === requesterId;
    const isPatient = note.patientId === requesterId;
    const canAccess = isAuthor || (isPatient && !note.isPrivate) || (!note.isPrivate && requesterRole === 'DOCTOR');

    if (!canAccess) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette note');
    }

    return note;
  }

  /**
   * Mettre à jour une note
   */
  async updateNote(noteId: string, doctorId: string, data: {
    type?: NoteType;
    title?: string;
    content?: string;
    isPrivate?: boolean;
    tags?: string[];
  }) {
    const note = await this.prisma.medicalNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note non trouvée');
    }

    if (note.doctorId !== doctorId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres notes');
    }

    return this.prisma.medicalNote.update({
      where: { id: noteId },
      data,
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Supprimer une note
   */
  async deleteNote(noteId: string, doctorId: string) {
    const note = await this.prisma.medicalNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note non trouvée');
    }

    if (note.doctorId !== doctorId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres notes');
    }

    await this.prisma.medicalNote.delete({
      where: { id: noteId },
    });

    return { success: true, message: 'Note supprimée' };
  }

  /**
   * Récupérer les notes liées à un rendez-vous
   */
  async getAppointmentNotes(appointmentId: string, requesterId: string, requesterRole: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        slot: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    // Vérifier l'accès
    const isDoctor = appointment.slot.ownerId === requesterId;
    const isPatient = appointment.patientId === requesterId;

    if (!isDoctor && !isPatient) {
      throw new ForbiddenException('Vous n\'avez pas accès à ce rendez-vous');
    }

    return this.prisma.medicalNote.findMany({
      where: {
        appointmentId,
        // Si c'est le patient, ne pas montrer les notes privées
        ...(isPatient && !isDoctor ? { isPrivate: false } : {}),
      },
      include: {
        doctor: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            doctorProfile: {
              select: {
                specialty: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupérer les tags utilisés par un médecin
   */
  async getDoctorTags(doctorId: string) {
    const notes = await this.prisma.medicalNote.findMany({
      where: { doctorId },
      select: { tags: true },
    });

    const tagsSet = new Set<string>();
    for (const note of notes) {
      for (const tag of note.tags) {
        tagsSet.add(tag);
      }
    }

    return Array.from(tagsSet).sort();
  }

  /**
   * Rechercher dans les notes
   */
  async searchNotes(doctorId: string, query: string) {
    return this.prisma.medicalNote.findMany({
      where: {
        doctorId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } },
        ],
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
