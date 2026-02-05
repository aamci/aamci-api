import { IsEmail, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum TeamRole {
  SECRETARY = 'SECRETARY',
  NURSE = 'NURSE',
  ASSISTANT = 'ASSISTANT',
  INTERN = 'INTERN',
}

export class CreateTeamMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(TeamRole)
  role: TeamRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
