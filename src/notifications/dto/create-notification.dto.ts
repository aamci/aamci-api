import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  type: string; // "APPOINTMENT_REMINDER", "APPOINTMENT_CONFIRMED", "APPOINTMENT_CANCELLED", "APPOINTMENT_RESCHEDULED", "GENERAL"

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  relatedAppointmentId?: string;

  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  sendSms?: boolean;
}
