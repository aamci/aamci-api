import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateFacilityManagerDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  facilityId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  managedDoctorIds?: string[];
}
