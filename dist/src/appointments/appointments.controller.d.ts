import { AppointmentsService } from './appointments.service';
export declare class AppointmentsController {
    private readonly svc;
    constructor(svc: AppointmentsService);
    list(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        slotId: string;
        patientId: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        notes: string | null;
    }[]>;
    create(dto: {
        slotId: string;
        notes?: string;
    }, req: any): import(".prisma/client").Prisma.Prisma__AppointmentClient<{
        id: string;
        createdAt: Date;
        slotId: string;
        patientId: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        notes: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
