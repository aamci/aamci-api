import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard that skips rate-limiting for OPTIONS preflight requests.
 * Without this, the global ThrottlerGuard can intercept CORS preflight and return 400/429.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ method: string }>();
    return req.method === 'OPTIONS';
  }
}
