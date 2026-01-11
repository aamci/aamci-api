import { IsNotEmpty, IsInt, IsDateString, IsArray, Min, Max, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateAvailabilityRuleDto {
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek: number[];

  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsInt()
  @Min(0)
  @Max(23)
  endHour: number;

  @IsInt()
  @Min(5)
  @Max(120)
  slotDurationMins: number;

  @IsInt()
  @Min(1)
  @Max(10)
  capacity: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedTimes?: string[];

  // Appointment types restrictions
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedKindIds?: string[];

  // Advanced parameters
  @IsInt()
  @Min(0)
  @IsOptional()
  minBookingNotice?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxBookingAdvance?: number;

  @IsBoolean()
  @IsOptional()
  autoConfirm?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCancellation?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  cancellationDeadline?: number;

  @IsString()
  @IsOptional()
  doctorId?: string; // Pour les FACILITY_MANAGER
}
