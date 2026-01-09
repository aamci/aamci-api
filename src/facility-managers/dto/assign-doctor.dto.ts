import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDoctorDto {
  @IsNotEmpty()
  @IsString()
  doctorId: string;
}
