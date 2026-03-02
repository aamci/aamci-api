import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

enum Role {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PHARMACY = 'PHARMACY',
  HOSPITAL = 'HOSPITAL',
  ADMIN = 'ADMIN',
  FACILITY_MANAGER = 'FACILITY_MANAGER',
  ADMIN_READ = 'ADMIN_READ',
  ADMIN_WRITE = 'ADMIN_WRITE',
  GUEST = 'GUEST',
}

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'L\'email est obligatoire' })
  email: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Le rôle doit être PATIENT, DOCTOR, PHARMACY, HOSPITAL ou ADMIN' })
  role?: Role;
}
