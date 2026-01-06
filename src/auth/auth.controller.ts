import { Body, Controller, Post, Res, HttpCode, HttpStatus, UseGuards, Get, Req, Query } from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';

type Role = 'PATIENT' | 'DOCTOR' | 'PHARMACY' | 'HOSPITAL' | 'ADMIN';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Max 3 registrations per minute
  async register(
    @Body() body: { email: string; password: string; role?: Role },
  ) {
    const result = await this.auth.register(
      body.email,
      body.password,
      body.role ?? 'PATIENT',
    );

    // Ne pas set le cookie, attendre la vérification d'email
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Max 5 login attempts per minute
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.auth.login(body.email, body.password);

    // Set httpOnly cookie instead of returning token
    this.setAuthCookie(res, access_token);

    return { success: true, message: 'Login successful' };
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
  async resendVerification(@Body() body: { email: string }) {
    return this.auth.resendVerificationEmail(body.email);
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
