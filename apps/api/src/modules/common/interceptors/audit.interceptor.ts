import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../audit.service';

/** Rutas sensibles (los movimientos de dinero en /transactions y /transfers se auditan explícitamente en servicio). */
const SENSITIVE_PATH_PREFIXES = ['/investments/tiered', '/accounts'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const method = req.method;
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }
    const path = req.originalUrl ?? req.url ?? '';
    if (!SENSITIVE_PATH_PREFIXES.some((p) => path.startsWith(p))) {
      return next.handle();
    }
    const user = req.user;
    if (!user?.id) {
      return next.handle();
    }
    const safePath = path.split('?')[0] ?? path;
    return next.handle().pipe(
      tap(() => {
        void this.audit.logSensitiveAction({
          userId: user.id,
          auth0Sub: user.auth0Subject,
          action: `${method} ${safePath}`,
          resource: safePath,
          metadata: {
            method,
            path: safePath,
            bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body as object) : [],
          },
          ip: req.ip,
          userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
        });
      }),
    );
  }
}
