import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as argon2 from 'argon2';
import { Role } from '../auth/auth.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    try {
      return await this.prisma.user.findUnique({ where: { email } });
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`);
      // Les filtres Prisma globaux géreront les erreurs spécifiques
      throw error;
    }
  }


  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async create(email: string, password: string, role: Role, fullName?: string) {
    const hash = await argon2.hash(password);
    return this.prisma.user.create({
      data: { email, password: hash, role, ...(fullName ? { fullName } : {}) },
    });
  }

  /**
   * Créer un nouveau patient (par un médecin)
   */
  async createPatient(data: {
    fullName: string;
    email: string;
    phone?: string;
    gender?: 'male' | 'female';
    birthDate?: string;
    birthPlace?: string;
    birthName?: string;
    createdByDoctorId: string;
  }) {
    // Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    // Générer un mot de passe temporaire aléatoire
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const hash = await argon2.hash(tempPassword);

    // Créer le patient
    const patient = await this.prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        phone: data.phone || null,
        sex: data.gender === 'female' ? 'F' : data.gender === 'male' ? 'M' : null,
        birthdate: data.birthDate ? new Date(data.birthDate) : null,
        city: data.birthPlace || null,
        password: hash,
        role: 'PATIENT',
      },
    });

    this.logger.log(`Patient created by doctor ${data.createdByDoctorId}: ${patient.id}`);

    return {
      id: patient.id,
      email: patient.email,
      fullName: patient.fullName,
      phone: patient.phone,
      sex: patient.sex,
      birthdate: patient.birthdate,
    };
  }

  async validatePassword(storedHash: string, plain: string) {
    return argon2.verify(storedHash, plain);
  }
  
  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (!user.password) throw new Error('Cannot change password for OAuth users');
    const ok = await argon2.verify(user.password, current);
    if (!ok) throw new Error('Mot de passe actuel incorrect');
    const hash = await argon2.hash(next);
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }

  async search(query: string, role?: Role) {
    const where: any = {
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (role) {
      where.role = role;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
      },
      take: 10,
    });
  }

  async findOrCreateOAuthUser(params: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
    provider: string;
    providerAccountId: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }) {
    const { email, fullName, avatarUrl, provider, providerAccountId, accessToken, refreshToken, expiresAt } = params;

    // Chercher un compte existant pour ce provider
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingAccount) {
      // Mettre à jour les tokens si nécessaire
      await this.prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken,
          refreshToken,
          expiresAt,
        },
      });
      return existingAccount.user;
    }

    // Chercher un utilisateur existant avec cet email
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Créer un nouvel utilisateur
      user = await this.prisma.user.create({
        data: {
          email,
          fullName,
          avatarUrl,
          role: 'PATIENT', // Par défaut, les utilisateurs OAuth sont des patients
        },
      });
    }

    // Créer le compte OAuth
    await this.prisma.account.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId,
        accessToken,
        refreshToken,
        expiresAt,
      },
    });

    return user;
  }

  /**
   * Récupérer tous les patients d'un médecin (basé sur les rendez-vous)
   */
  async getDoctorPatients(doctorId: string) {
    // Trouver tous les patients uniques qui ont eu un rendez-vous avec ce médecin
    const appointments = await this.prisma.appointment.findMany({
      where: {
        slot: {
          ownerId: doctorId,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            sex: true,
            birthdate: true,
            city: true,
            createdAt: true,
          },
        },
        slot: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Obtenir les patients uniques avec statistiques
    const patientsMap = new Map();

    for (const appointment of appointments) {
      const patientId = appointment.patient.id;

      if (!patientsMap.has(patientId)) {
        patientsMap.set(patientId, {
          ...appointment.patient,
          appointmentCount: 0,
          lastAppointmentDate: null,
          nextAppointmentDate: null,
        });
      }

      const patientData = patientsMap.get(patientId);
      patientData.appointmentCount++;

      // Dernière visite (rendez-vous passé le plus récent)
      if (
        appointment.status !== 'CANCELLED' &&
        new Date(appointment.slot.start) < new Date()
      ) {
        if (
          !patientData.lastAppointmentDate ||
          new Date(appointment.slot.start) > new Date(patientData.lastAppointmentDate)
        ) {
          patientData.lastAppointmentDate = appointment.slot.start;
        }
      }

      // Prochain rendez-vous (rendez-vous futur le plus proche)
      if (
        appointment.status !== 'CANCELLED' &&
        new Date(appointment.slot.start) > new Date()
      ) {
        if (
          !patientData.nextAppointmentDate ||
          new Date(appointment.slot.start) < new Date(patientData.nextAppointmentDate)
        ) {
          patientData.nextAppointmentDate = appointment.slot.start;
        }
      }
    }

    return Array.from(patientsMap.values());
  }

  /**
   * Récupérer les détails d'un patient avec son historique de rendez-vous
   */
  async getPatientDetails(patientId: string, doctorId: string) {
    // Vérifier que le médecin a bien eu des rendez-vous avec ce patient
    const hasAppointments = await this.prisma.appointment.findFirst({
      where: {
        patientId,
        slot: {
          ownerId: doctorId,
        },
      },
    });

    if (!hasAppointments) {
      throw new Error('Patient not found or no appointments with this doctor');
    }

    // Récupérer les informations du patient
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        sex: true,
        birthdate: true,
        city: true,
        createdAt: true,
      },
    });

    // Récupérer l'historique des rendez-vous
    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId,
        slot: {
          ownerId: doctorId,
        },
      },
      include: {
        slot: true,
        kind: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculer les statistiques
    const stats = {
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(
        (a) => a.status === 'CONFIRMED' && new Date(a.slot.start) < new Date()
      ).length,
      cancelledAppointments: appointments.filter((a) => a.status === 'CANCELLED')
        .length,
      upcomingAppointments: appointments.filter(
        (a) =>
          a.status !== 'CANCELLED' && new Date(a.slot.start) > new Date()
      ).length,
    };

    return {
      patient,
      appointments,
      stats,
    };
  }

  /**
   * Rechercher des patients d'un médecin
   */
  async searchDoctorPatients(doctorId: string, query: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        slot: {
          ownerId: doctorId,
        },
        patient: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      distinct: ['patientId'],
      take: 10,
    });

    return appointments.map((a) => a.patient);
  }
}