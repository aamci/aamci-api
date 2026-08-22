import { Body, Controller, Post, Delete, Patch, Res, HttpCode, HttpStatus, UseGuards, Get, Req, Query, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const ip = (req.headers as any)['x-forwarded-for']?.split(',')[0]?.trim()
      ?? (req as any).socket?.remoteAddress
      ?? 'unknown';
    const result = await this.auth.register(
      registerDto.email,
      registerDto.password,
      registerDto.role ?? 'PATIENT',
      registerDto.fullName,
      ip,
      registerDto.consentedToTerms ?? false,
    );

    // Ne pas set le cookie, attendre la vérification d'email
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(loginDto.email, loginDto.password);

    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true, tempToken: result.tempToken };
    }

    this.setAuthCookie(res, result.access_token);
    return { success: true, message: 'Login successful', token: result.access_token };
  }

  @Post('2fa-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginWith2fa(
    @Body() body: { tempToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = await this.auth.loginWith2fa(body.tempToken, body.code);
    this.setAuthCookie(res, access_token);
    return { success: true, message: 'Login successful', token: access_token };
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
    return this.auth.getMe(req.user.userId);
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/oauth-success?token=${access_token}`);
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/oauth-success?token=${access_token}`);
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

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'Si cet email existe, vous recevrez un lien de réinitialisation dans quelques minutes.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password);
    return { message: 'Mot de passe réinitialisé avec succès.' };
  }

  @Get('deletion-status')
  @UseGuards(JwtAuthGuard)
  async deletionStatus(@Req() req: any) {
    return this.auth.getDeletionStatus(req.user.userId);
  }

  @Patch('cancel-deletion')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async cancelDeletion(@Req() req: any) {
    await this.auth.cancelDeletion(req.user.userId);
    return { success: true, message: 'Suppression annulée' };
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.deleteAccount(req.user.userId);
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { success: true, message: 'Compte supprimé avec succès' };
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
