import { PrismaService } from '../common/prisma.service';
type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    create(email: string, password: string, role?: Role): Promise<{
        id: string;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        updatedAt: Date;
    }>;
    validatePassword(hash: string, plain: string): Promise<boolean>;
}
export {};
