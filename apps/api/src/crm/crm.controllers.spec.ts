import 'reflect-metadata';

import { PERMISSION_METADATA_KEY } from '../common/decorators/require-permission.decorator';
import { ContactLeadsController } from './crm.controllers';

describe('ContactLeadsController permissions', () => {
  it('uses the dedicated Contact Leads module for read access', () => {
    expect(
      Reflect.getMetadata(PERMISSION_METADATA_KEY, ContactLeadsController),
    ).toEqual({ moduleKey: 'contact_leads', action: 'view' });
  });

  it.each([
    ['create', 'create'],
    ['update', 'update'],
    ['markInterested', 'update'],
    ['markNotInterested', 'update'],
    ['unarchive', 'update'],
    ['convert', 'update'],
    ['delete', 'delete'],
  ] as const)('sets %s to require the %s action', (method, action) => {
    expect(
      Reflect.getMetadata(
        PERMISSION_METADATA_KEY,
        ContactLeadsController.prototype[method],
      ),
    ).toEqual({ moduleKey: 'contact_leads', action });
  });
});
