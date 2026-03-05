import { Injectable, Logger, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger('JwtAuthGuard');

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      const req = context.switchToHttp().getRequest();
      this.logger.warn(
        `401 Unauthorized — ${req.method} ${req.url} | reason: ${info?.message ?? err?.message ?? 'no token'}`,
      );
    }
    return super.handleRequest(err, user, info, context);
  }
}