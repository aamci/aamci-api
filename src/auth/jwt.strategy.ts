import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extract JWT from cookies OR Authorization header (fallback for API clients)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Priority 1: Extract from httpOnly cookie
          return request?.cookies?.token;
        },
        // Priority 2: Fallback to Authorization header for API clients
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_secret',
    });
  }

  async validate(payload: any) {
    // Inject into req.user
    return {
      userId: payload.sub, // Changed from 'id' to 'userId' for consistency
      email: payload.email,
      role: payload.role,
      name: payload.name ?? null,
    };
  }
}