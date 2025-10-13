import { AuthService } from './auth.service';
type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(body: {
        email: string;
        password: string;
        role?: Role;
    }): Promise<{
        access_token: string;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        access_token: string;
    }>;
}
export {};
