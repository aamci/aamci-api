import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../common/jwt.strategy';
import { PrismaService } from '../common/prisma.service';
@Module({
     imports:[UsersModule,
        PassportModule,
        JwtModule.register({ secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me', signOptions:{ expiresIn:'7d' } })], 
        providers:[AuthService, JwtStrategy,PrismaService],
         controllers:[AuthController],
         exports: [AuthService], })
export class AuthModule{}
