import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreatePreferenceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  // Paramètres de base (horaires et jours)
  @IsNotEmpty()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek: number[]; // [1,2,3,4,5]

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(23)
  endHour: number;

  @IsNotEmpty()
  @IsInt()
  @Min(5)
  @Max(240)
  slotDurationMins: number;

  // Capacité et types RDV
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedKindIds?: string[];

  // Périodes d'exclusion
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedTimes?: string[]; // ["12:00-13:00", "14:30-15:00"]

  // Paramètres avancés
  @IsOptional()
  @IsInt()
  @Min(0)
  minBookingNotice?: number; // En heures

  @IsOptional()
  @IsInt()
  @Min(1)
  maxBookingAdvance?: number; // En jours

  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCancellation?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationDeadline?: number; // En heures
}
