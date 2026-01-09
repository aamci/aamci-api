import { PartialType } from '@nestjs/mapped-types';
import { CreateAvailabilityRuleDto } from './create-availability-rule.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAvailabilityRuleDto extends PartialType(CreateAvailabilityRuleDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
