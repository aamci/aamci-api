import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';
@Controller('auth')
export class AuthController{
  constructor(private readonly auth: AuthService){}
  @Post('register')
  register(@Body() body: { email:string; password:string; role?: Role }){
    return this.auth.register(body.email, body.password, body.role ?? 'PATIENT');
  }
  @Post('login')
  login(@Body() body: { email:string; password:string }){ return this.auth.login(body.email, body.password); }
}
