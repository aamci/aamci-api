import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  doctorId: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  professionalismRating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
