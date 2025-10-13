import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { PrismaService } from './common/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { SearchModule } from './search/search.module';
@Module({ imports:[HealthModule, UsersModule, AuthModule, AppointmentsModule,SearchModule], providers:[PrismaService] })
export class AppModule {}
