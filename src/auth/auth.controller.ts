import { Body, Controller, Post, Res, HttpCode, HttpStatus, UseGuards, Get, Req, Query, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('auth')
@UsePipes(new ValidationPipe({
  whitelist: true, // Supprime les propriétés non définies dans le DTO
  forbidNonWhitelisted: true, // Rejette la requête si des propriétés inconnues sont présentes
  transform: true, // Transforme automatiquement les types
}))
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Max 3 registrations per minute
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.auth.register(
      registerDto.email,
      registerDto.password,
      registerDto.role ?? 'PATIENT',
    );

    // Ne pas set le cookie, attendre la vérification d'email
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // Max 100 login attempts per minute (dev mode)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.auth.login(loginDto.email, loginDto.password);

    // Set httpOnly cookie for same-origin requests
    this.setAuthCookie(res, access_token);

    // Also return token in body for cross-origin requests
    return {
      success: true,
      message: 'Login successful',
      token: access_token // Return token for cross-origin scenarios
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true, message: 'Logout successful' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: any) {
    console.log('req.user: ', req.user)
    // req.user is populated by JwtAuthGuard
    return {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    };
  }

  // Google OAuth
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const { access_token } = await this.auth.oauthLogin(req.user);

    // Set httpOnly cookie
    this.setAuthCookie(res, access_token);

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/oauth-success`);
  }

  // Facebook OAuth
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookAuthCallback(@Req() req: any, @Res() res: Response) {
    const { access_token } = await this.auth.oauthLogin(req.user);

    // Set httpOnly cookie
    this.setAuthCookie(res, access_token);

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/oauth-success`);
  }

  // Email Verification
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token) {
      throw new BadRequestException('Le token de vérification est obligatoire');
    }

    const { access_token } = await this.auth.verifyEmail(token);

    // Set httpOnly cookie to automatically log in the user
    this.setAuthCookie(res, access_token);

    return {
      success: true,
      message: 'Email verified successfully. You are now logged in.'
    };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Max 3 resend attempts per minute
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.auth.resendVerificationEmail(resendDto.email);
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true, // Cannot be accessed by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
