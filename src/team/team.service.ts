import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  async getTeamMembers(ownerId: string) {
    return this.prisma.teamMember.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeamMember(ownerId: string, memberId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: {
        id: memberId,
        ownerId,
      },
    });

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return member;
  }

  async inviteTeamMember(ownerId: string, createDto: CreateTeamMemberDto) {
    // Check if email already exists for this owner
    const existing = await this.prisma.teamMember.findUnique({
      where: { ownerId_email: { ownerId, email: createDto.email } },
    });

    if (existing) {
      throw new ConflictException('A team member with this email already exists');
    }

    const inviter = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { fullName: true },
    });

    // Check if the invited person already has an account
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createDto.email },
    });

    const now = new Date();
    let member: any;

    if (existingUser) {
      // User exists — link immediately and activate
      member = await this.prisma.teamMember.create({
        data: {
          ownerId,
          userId: existingUser.id,
          email: createDto.email,
          fullName: createDto.fullName,
          phone: createDto.phone,
          role: createDto.role,
          permissions: createDto.permissions || [],
          status: 'ACTIVE',
          invitedAt: now,
          joinedAt: now,
          lastActiveAt: now,
        },
      });

      // Update user role to SECRETARY
      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'SECRETARY' },
      });

      // Send in-app notification
      await this.notificationsService.create({
        userId: existingUser.id,
        type: 'TEAM_INVITATION',
        title: 'Vous avez été ajouté à une équipe',
        message: `${inviter?.fullName || 'Un médecin'} vous a ajouté à son équipe en tant que ${createDto.role.toLowerCase()}.`,
      });
    } else {
      // User doesn't exist yet — create pending invitation
      member = await this.prisma.teamMember.create({
        data: {
          ownerId,
          email: createDto.email,
          fullName: createDto.fullName,
          phone: createDto.phone,
          role: createDto.role,
          permissions: createDto.permissions || [],
          status: 'PENDING',
          invitedAt: now,
        },
      });
    }

    // Send invitation email (different CTA depending on whether user already exists)
    try {
      await this.emailService.sendTeamInvitation(
        createDto.email,
        inviter?.fullName || 'Un médecin',
        createDto.fullName,
        createDto.role,
        !!existingUser,
      );
    } catch (error) {
      console.error('Failed to send team invitation email:', error);
    }

    return member;
  }

  // For SECRETARY: returns their membership records with employer doctor info
  async getMyMembership(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    const result = await Promise.all(
      memberships.map(async (m) => {
        const owner = await this.prisma.user.findUnique({
          where: { id: m.ownerId },
          select: {
            id: true,
            fullName: true,
            email: true,
            doctorProfile: {
              select: { specialty: true, city: true },
            },
          },
        });
        return { ...m, owner };
      }),
    );

    return result;
  }

  async updateTeamMember(
    ownerId: string,
    memberId: string,
    updateDto: UpdateTeamMemberDto,
  ) {
    const member = await this.getTeamMember(ownerId, memberId);

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        ...updateDto,
        updatedAt: new Date(),
      },
    });
  }

  async updatePermissions(
    ownerId: string,
    memberId: string,
    permissions: string[],
  ) {
    const member = await this.getTeamMember(ownerId, memberId);

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        permissions,
        updatedAt: new Date(),
      },
    });
  }

  async resendInvitation(ownerId: string, memberId: string) {
    const member = await this.getTeamMember(ownerId, memberId);

    if (member.status !== 'PENDING') {
      throw new BadRequestException('Can only resend invitation for pending members');
    }

    // Update invited date
    await this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        invitedAt: new Date(),
      },
    });

    // Resend invitation email
    const inviter = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { fullName: true },
    });
    try {
      await this.emailService.sendTeamInvitation(
        member.email,
        inviter?.fullName || 'Un médecin',
        member.fullName,
        member.role,
      );
    } catch (error) {
      console.error('Failed to resend team invitation email:', error);
    }

    return { message: 'Invitation resent successfully' };
  }

  async activateMember(ownerId: string, memberId: string, userId: string) {
    const member = await this.getTeamMember(ownerId, memberId);

    if (member.status !== 'PENDING') {
      throw new BadRequestException('Member is not pending activation');
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        userId,
        status: 'ACTIVE',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    // Notify the new member
    try {
      const owner = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { fullName: true },
      });
      await this.notificationsService.create({
        userId,
        type: 'TEAM_JOINED',
        title: 'Bienvenue dans l\'équipe',
        message: `Vous avez rejoint l'équipe de ${owner?.fullName || 'un médecin'} en tant que ${member.role.toLowerCase()}.`,
      });
    } catch (e) {
      console.error('Failed to send TEAM_JOINED notification:', e);
    }

    return updated;
  }

  async deactivateMember(ownerId: string, memberId: string) {
    const member = await this.getTeamMember(ownerId, memberId);

    const updated = await this.prisma.teamMember.update({
      where: { id: member.id },
      data: { status: 'INACTIVE' },
    });

    // Notify the deactivated member
    if (member.userId) {
      try {
        const owner = await this.prisma.user.findUnique({
          where: { id: ownerId },
          select: { fullName: true },
        });
        await this.notificationsService.create({
          userId: member.userId,
          type: 'TEAM_DEACTIVATED',
          title: 'Accès retiré',
          message: `Votre accès à l'équipe de ${owner?.fullName || 'un médecin'} a été désactivé.`,
        });
      } catch (e) {
        console.error('Failed to send TEAM_DEACTIVATED notification:', e);
      }
    }

    return updated;
  }

  async reactivateMember(ownerId: string, memberId: string) {
    const member = await this.getTeamMember(ownerId, memberId);

    if (member.status !== 'INACTIVE') {
      throw new BadRequestException('Member is not inactive');
    }

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        status: 'ACTIVE',
        lastActiveAt: new Date(),
      },
    });
  }

  async removeTeamMember(ownerId: string, memberId: string) {
    const member = await this.getTeamMember(ownerId, memberId);

    await this.prisma.teamMember.delete({
      where: { id: member.id },
    });

    return { message: 'Team member removed successfully' };
  }

  async getTeamStats(ownerId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { ownerId },
      select: { status: true, role: true },
    });

    const stats = {
      total: members.length,
      active: members.filter((m) => m.status === 'ACTIVE').length,
      pending: members.filter((m) => m.status === 'PENDING').length,
      inactive: members.filter((m) => m.status === 'INACTIVE').length,
      byRole: {} as Record<string, number>,
    };

    members.forEach((m) => {
      stats.byRole[m.role] = (stats.byRole[m.role] || 0) + 1;
    });

    return stats;
  }

  async updateLastActive(memberId: string) {
    await this.prisma.teamMember.update({
      where: { id: memberId },
      data: { lastActiveAt: new Date() },
    });
  }

  // Check if a user has permission for an action on a team
  async checkPermission(
    ownerId: string,
    userId: string,
    permission: string,
  ): Promise<boolean> {
    const member = await this.prisma.teamMember.findFirst({
      where: {
        ownerId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!member) {
      return false;
    }

    return member.permissions.includes(permission);
  }
}
