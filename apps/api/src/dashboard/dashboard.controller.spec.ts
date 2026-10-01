import { GUARDS_METADATA } from '@nestjs/common/constants';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { DashboardController } from './dashboard.controller';

describe('DashboardController tenant boundary', () => {
  it('requires the verified tenant guard for every dashboard endpoint', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DashboardController);

    expect(guards).toEqual(expect.arrayContaining([TenantGuard]));
  });
});
