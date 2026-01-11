import { IsNotEmpty, IsDateString, IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class CreateAbsenceDto {
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['VACATION', 'SICK_LEAVE', 'TRAINING', 'PERSONAL', 'OTHER'])
  type: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  blockSlots?: boolean;

  @IsOptional()
  @IsBoolean()
  cancelAppointments?: boolean;
}
