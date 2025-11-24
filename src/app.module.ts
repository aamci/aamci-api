import { Module } from '@nestjs/common';
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


@Module({ 
    imports:[
        HealthModule, 
        UsersModule, 
        AuthModule, 
        AppointmentsModule,
        SearchModule, 
        SlotsModule, 
        AppointmentKindsModule, 
        DoctorProfilesModule, StatsModule, WalletModule, PaymentsModule,
    ],
     providers:[PrismaService]
    })
export class AppModule {}
