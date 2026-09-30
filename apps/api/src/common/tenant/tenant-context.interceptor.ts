import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  TenantContextPayload,
  TenantContextService,
} from './tenant-context.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenants: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ tenant?: TenantContextPayload }>();
    const tenant = request.tenant;
    if (!tenant) return next.handle();
    // Subscribe inside ALS: creating the observable inside run() is not enough.
    return new Observable((subscriber) =>
      this.tenants.run(tenant, () => next.handle().subscribe(subscriber)),
    );
  }
}
