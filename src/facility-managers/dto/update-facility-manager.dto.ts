import { PartialType } from '@nestjs/mapped-types';
import { CreateFacilityManagerDto } from './create-facility-manager.dto';

export class UpdateFacilityManagerDto extends PartialType(CreateFacilityManagerDto) {}
