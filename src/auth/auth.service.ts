import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

export type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, role: Role = 'PATIENT') {
    const exists = await this.users.findByEmail(email);
    if (exists) {
      // 409 plus parlant que 401 ici
      throw new ConflictException('Email already registered');
    }

    // crée l’utilisateur (le UsersService doit hasher)
    const user = await this.users.create(email, password, role);

    return this.sign(user.id, user.email, user.role as Role);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // délègue la vérification du hash au UsersService
    const ok = await this.users.validatePassword(user.password, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.sign(user.id, user.email, user.role as Role);
  }

  private sign(sub: string, email: string, role: Role) {
    const access_token = this.jwt.sign(
      { sub, email, role },
      {
        // secret + durée éventuelle
        secret: process.env.JWT_SECRET || 'changeme',
        expiresIn: '7d',
      },
    );
    return { access_token };
  }
}