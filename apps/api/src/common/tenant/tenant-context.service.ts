import { ForbiddenException, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextPayload {
  organizationId: string;
  organizationSlug?: string;
  organizationName?: string;
  status?: string;
  setupFeePaid?: boolean;
  role?: string;
  isOwner?: boolean;
  userId?: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContextPayload>();

  run<T>(context: TenantContextPayload, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  getTenant(): TenantContextPayload | undefined {
    return this.storage.getStore();
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.organizationId;
  }

  getRequiredTenantId(): string {
    const id = this.getTenantId();
    if (!id) {
      throw new ForbiddenException(
        'Select a tenant workspace before performing this operation.',
      );
    }
    return id;
  }

  isSetupFeePaid(): boolean {
    return Boolean(this.storage.getStore()?.setupFeePaid);
  }
}
