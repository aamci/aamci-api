import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/throttler.guard';
import { HealthModule } from './health/health.module';
import { PrismaService } from './common/prisma.service';
import { DatabaseHealthService } from './common/database-health.service';
import { DataPurgeService } from './common/data-purge.service';
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
import { NotificationsModule } from './notifications/notifications.module';
import { FavoritesModule } from './favorites/favorites.module';
import { MedicalDocumentsModule } from './medical-documents/medical-documents.module';
import { MedicalNotesModule } from './medical-notes/medical-notes.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { TasksModule } from './tasks/tasks.module';
import { PatientRecordModule } from './patient-record/patient-record.module';
import { ReviewsModule } from './reviews/reviews.module';
import { HealthRecordsModule } from './health-records/health-records.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { TeamModule } from './team/team.module';
import { CalendarSyncModule } from './calendar-sync/calendar-sync.module';
import { PrescriptionTemplatesModule } from './prescription-templates/prescription-templates.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { MessagesModule } from './messages/messages.module';
import { AdminModule } from './admin/admin.module';
import { TicketsModule } from './tickets/tickets.module';
import { ReferralsModule } from './referrals/referrals.module';
import { CorrespondencesModule } from './correspondences/correspondences.module';
import { StorageModule } from './common/storage.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { ReportsModule } from './reports/reports.module';
import { BlocksModule } from './blocks/blocks.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Rate limiting: 200 req/min globally; sensitive endpoints override with stricter limits
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 200, // 200 requests max (normal API usage)
      },
    ]),
    StorageModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AppointmentsModule,
    SearchModule,
    SlotsModule,
    AvailabilityRulesModule,
    AvailabilityPreferencesModule,
    DoctorAbsencesModule,
    NotificationsModule,
    AppointmentKindsModule,
    DoctorProfilesModule,
    StatsModule,
    WalletModule,
    PaymentsModule,
    FacilitiesModule,
    FacilityManagersModule,
    FavoritesModule,
    MedicalDocumentsModule,
    MedicalNotesModule,
    InvoicesModule,
    PrescriptionsModule,
    TasksModule,
    PatientRecordModule,
    ReviewsModule,
    HealthRecordsModule,
    WebhooksModule,
    TwoFactorModule,
    TeamModule,
    CalendarSyncModule,
    PrescriptionTemplatesModule,
    AnalyticsModule,
    ConsultationsModule,
    MessagesModule,
    AdminModule,
    TicketsModule,
    ReferralsModule,
    CorrespondencesModule,
    WaitlistModule,
    QuestionnairesModule,
    BeneficiariesModule,
    CleanupModule,
    ReportsModule,
    BlocksModule,
    SubscriptionsModule,
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    DatabaseHealthService,
    DataPurgeService,
    // Apply throttler globally
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
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
