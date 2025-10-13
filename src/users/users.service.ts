import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as argon2 from 'argon2';

type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';
@Injectable()
export class UsersService{
  constructor(private prisma: PrismaService){}
  findByEmail(email:string){ return this.prisma.user.findUnique({ where:{ email } }); }
  async create(email: string, password: string, role: Role = 'PATIENT') {
    const hash = await argon2.hash(password);
    return this.prisma.user.create({ data:{ email, password: hash, role } });
  }
  validatePassword(hash:string, plain:string){ return argon2.verify(hash, plain); }
}
