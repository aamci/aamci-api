import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';
export declare class AuthService {
    private users;
    private jwt;
    constructor(users: UsersService, jwt: JwtService);
    register(email: string, password: string, role?: Role): Promise<{
        access_token: string;
    }>;
    login(email: string, password: string): Promise<{
        access_token: string;
    }>;
    private sign;
}
export {};
