import { IsNotEmpty, IsDateString, IsOptional, IsString } from 'class-validator';

export class ApplyPreferenceDto {
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  doctorId?: string; // Pour les FACILITY_MANAGER
}
