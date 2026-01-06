import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { PrismaService } from './common/prisma.service';
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
    AppointmentKindsModule,
    DoctorProfilesModule,
    StatsModule,
    WalletModule,
    PaymentsModule,
    FacilitiesModule,
  ],
  providers: [
    PrismaService,
    // Apply throttler globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
