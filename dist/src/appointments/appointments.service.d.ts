import { PrismaService } from '../common/prisma.service';
export declare class AppointmentsService {
    private prisma;
    constructor(prisma: PrismaService);
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
        patientId: string;
        notes?: string;
    }): import(".prisma/client").Prisma.Prisma__AppointmentClient<{
        id: string;
        createdAt: Date;
        slotId: string;
        patientId: string;
        status: import(".prisma/client").$Enums.AppointmentStatus;
        notes: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
