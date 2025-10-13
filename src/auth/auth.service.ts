import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';
@Injectable()
export class AuthService{
  constructor(private users: UsersService, private jwt: JwtService){}
  async register(email: string, password: string, role: Role = 'PATIENT') {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new UnauthorizedException('Email already registered');
    const user = await this.users.create(email, password, role);
    return this.sign(user.id, user.email, user.role);
  }
  async login(email:string, password:string){
    const user = await this.users.findByEmail(email);
    if(!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await this.users.validatePassword(user.password, password);
    if(!ok) throw new UnauthorizedException('Invalid credentials');
    return this.sign(user.id, user.email, user.role);
  }
  private sign(sub: string, email: string, role: Role){
    const access_token = this.jwt.sign({ sub, email, role });
    return { access_token };
  }
}
