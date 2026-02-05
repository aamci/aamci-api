import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, IsArray, Min, Max } from 'class-validator';

export enum CalendarProvider {
  GOOGLE = 'GOOGLE',
  OUTLOOK = 'OUTLOOK',
  APPLE = 'APPLE',
}

export enum SyncDirection {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  BOTH = 'BOTH',
}

export class CreateCalendarConnectionDto {
  @IsEnum(CalendarProvider)
  provider: CalendarProvider;

  @IsString()
  providerAccountId: string;

  @IsOptional()
  @IsString()
  providerEmail?: string;

  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  tokenExpiresAt?: Date;
}

export class UpdateCalendarConnectionDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(SyncDirection)
  syncDirection?: SyncDirection;

  @IsOptional()
  @IsBoolean()
  showBusyOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  syncIntervalMins?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedCalendars?: string[];
}

export class RefreshTokenDto {
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  tokenExpiresAt?: Date;
}
