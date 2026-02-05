import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class UpdateHealthRecordDto {
  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  rhesus?: string;

  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsString()
  allergyDetails?: string;

  @IsOptional()
  @IsString()
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  surgicalHistory?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  smokingStatus?: string;

  @IsOptional()
  @IsString()
  alcoholConsumption?: string;

  @IsOptional()
  @IsString()
  physicalActivity?: string;

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  vaccinationRecord?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
