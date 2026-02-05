import { IsInt, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SetGoalsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenueGoal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  appointmentsGoal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  newPatientsGoal?: number;
}

export class GetAnalyticsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
