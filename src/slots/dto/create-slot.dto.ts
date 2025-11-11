import { IsDateString, IsInt, IsEnum, IsOptional } from 'class-validator';

export class CreateSlotDto {
  @IsDateString() start: string;
  @IsDateString() end: string;
  @IsInt() capacity: number;
  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';
}