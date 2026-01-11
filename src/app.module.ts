import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { PrismaService } from './common/prisma.service';
import { DatabaseHealthService } from './common/database-health.service';
import { HealthController } from './common/health.controller';
import {
  PrismaClientExceptionFilter,
  PrismaClientUnknownExceptionFilter,
  PrismaClientValidationExceptionFilter,
  PrismaClientInitializationExceptionFilter,
} from './common/prisma-exception.filter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SearchModule } from './search/search.module';
import { SlotsModule } from './slots/slots.module';
import { AppointmentKindsModule } from './appointment-kinds/appointment-kinds.module';
import { DoctorProfilesModule } from './doctor-profiles/doctor-profiles.module';
import { StatsModule } from './stats/stats.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { AvailabilityRulesModule } from './availability-rules/availability-rules.module';
import { FacilityManagersModule } from './facility-managers/facility-managers.module';
import { AvailabilityPreferencesModule } from './availability-preferences/availability-preferences.module';
import { DoctorAbsencesModule } from './doctor-absences/doctor-absences.module';

@Module({
  imports: [
    // Rate limiting: max 10 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests max
      },
    ]),
    HealthModule,
    UsersModule,
    AuthModule,
    AppointmentsModule,
    SearchModule,
    SlotsModule,
    AvailabilityRulesModule,
    AvailabilityPreferencesModule,
    DoctorAbsencesModule,
    AppointmentKindsModule,
    DoctorProfilesModule,
    StatsModule,
    WalletModule,
    PaymentsModule,
    FacilitiesModule,
    FacilityManagersModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    DatabaseHealthService,
    // Apply throttler globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global exception filters for Prisma errors
    {
      provide: APP_FILTER,
      useClass: PrismaClientExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaClientUnknownExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaClientValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaClientInitializationExceptionFilter,
    },
  ],
})
export class AppModule {}
