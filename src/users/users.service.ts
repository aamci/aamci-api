import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as argon2 from 'argon2';
import { Role } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }


  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async create(email: string, password: string, role: Role) {
    const hash = await argon2.hash(password);
    return this.prisma.user.create({
      data: { email, password: hash, role },
    });
  }

  async validatePassword(storedHash: string, plain: string) {
    return argon2.verify(storedHash, plain);
  }
  
  async changePassword(userId: string, current: string, next: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  const ok = await argon2.verify(user.password, current);
  if (!ok) throw new Error('Mot de passe actuel incorrect');
  const hash = await argon2.hash(next);
  return this.prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });
}
}