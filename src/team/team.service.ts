import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto, TeamMemberStatus } from './dto/update-team-member.dto';

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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
      where: {
        ownerId_email: {
          ownerId,
          email: createDto.email,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A team member with this email already exists');
    }

    // Create team member invitation
    const member = await this.prisma.teamMember.create({
      data: {
        ownerId,
        email: createDto.email,
        fullName: createDto.fullName,
        phone: createDto.phone,
        role: createDto.role,
        permissions: createDto.permissions || [],
        status: 'PENDING',
        invitedAt: new Date(),
      },
    });

    // Send invitation email
    const inviter = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { fullName: true },
    });
    try {
      await this.emailService.sendTeamInvitation(
        createDto.email,
        inviter?.fullName || 'Un médecin',
        createDto.fullName,
        createDto.role,
      );
    } catch (error) {
      console.error('Failed to send team invitation email:', error);
    }

    return member;
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

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        userId,
        status: 'ACTIVE',
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  }

  async deactivateMember(ownerId: string, memberId: string) {
    const member = await this.getTeamMember(ownerId, memberId);

    return this.prisma.teamMember.update({
      where: { id: member.id },
      data: {
        status: 'INACTIVE',
      },
    });
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
