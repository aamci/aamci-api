import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Controller('team')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  getTeamMembers(@Request() req) {
    return this.teamService.getTeamMembers(req.user.userId);
  }

  @Get('stats')
  getTeamStats(@Request() req) {
    return this.teamService.getTeamStats(req.user.userId);
  }

  @Get(':id')
  getTeamMember(@Request() req, @Param('id') id: string) {
    return this.teamService.getTeamMember(req.user.userId, id);
  }

  @Post('invite')
  inviteTeamMember(@Request() req, @Body() createDto: CreateTeamMemberDto) {
    return this.teamService.inviteTeamMember(req.user.userId, createDto);
  }

  @Put(':id')
  updateTeamMember(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateTeamMemberDto,
  ) {
    return this.teamService.updateTeamMember(req.user.userId, id, updateDto);
  }

  @Patch(':id/permissions')
  updatePermissions(
    @Request() req,
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
  ) {
    return this.teamService.updatePermissions(req.user.userId, id, permissions);
  }

  @Post(':id/resend-invitation')
  resendInvitation(@Request() req, @Param('id') id: string) {
    return this.teamService.resendInvitation(req.user.userId, id);
  }

  @Post(':id/deactivate')
  deactivateMember(@Request() req, @Param('id') id: string) {
    return this.teamService.deactivateMember(req.user.userId, id);
  }

  @Post(':id/reactivate')
  reactivateMember(@Request() req, @Param('id') id: string) {
    return this.teamService.reactivateMember(req.user.userId, id);
  }

  @Delete(':id')
  removeTeamMember(@Request() req, @Param('id') id: string) {
    return this.teamService.removeTeamMember(req.user.userId, id);
  }
}
