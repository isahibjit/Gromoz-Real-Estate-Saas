import { CrmService } from './crm.service';

export async function runMetaOAuthVerification() {
  console.log('Running Meta OAuth Authorization URL Verification Test...');
  const service = new (CrmService as any)({} as any, {} as any, {} as any);
  (service as any).ensureMetaIntegration = async () => ({
    id: 'integration-1',
    settings: {
      configId: '1381302940097054',
      useConfigId: true,
      overrideDefaultResponseType: true,
    },
    credentials: { accounts: [] },
  });
  (service as any).configuredMetaAppId = () => '2074437443204093';
  (service as any).metaAppSecret = () => 'mock-secret';
  (service as any).metaOAuthCallbackUrl = () =>
    'https://crmtrueroot.com/api/integrations/meta/oauth/callback';
  (service as any).encodeMetaOAuthState = () => 'mock-state-token';

  process.env.META_BUSINESS_LOGIN_CONFIG_ID = '1381302940097054';
  process.env.USE_META_CONFIG_ID = 'true';

  const result = await service.startMetaOAuth('user-1');
  const authUrl = result.data.authUrl;
  const parsedUrl = new URL(authUrl);

  console.log('Generated Auth URL:', authUrl);

  if (parsedUrl.searchParams.get('client_id') !== '2074437443204093') {
    throw new Error('FAILED: client_id missing or incorrect');
  }
  if (
    parsedUrl.searchParams.get('redirect_uri') !==
    'https://crmtrueroot.com/api/integrations/meta/oauth/callback'
  ) {
    throw new Error('FAILED: redirect_uri missing or incorrect');
  }
  if (parsedUrl.searchParams.get('config_id') !== '1381302940097054') {
    throw new Error('FAILED: config_id missing or incorrect');
  }
  if (parsedUrl.searchParams.get('response_type') !== 'code') {
    throw new Error('FAILED: response_type missing or incorrect');
  }
  if (parsedUrl.searchParams.get('override_default_response_type') !== 'true') {
    throw new Error(
      'FAILED: override_default_response_type=true missing or incorrect',
    );
  }
  if (parsedUrl.searchParams.get('state') !== 'mock-state-token') {
    throw new Error('FAILED: state missing or incorrect');
  }
  if (parsedUrl.searchParams.has('scope')) {
    throw new Error(
      'FAILED: scope parameter must NOT be present when config_id is used',
    );
  }

  console.log('✅ ALL CHECKS PASSED:');
  console.log('  1. client_id is present: 2074437443204093');
  console.log(
    '  2. redirect_uri is present: https://crmtrueroot.com/api/integrations/meta/oauth/callback',
  );
  console.log('  3. config_id is present: 1381302940097054');
  console.log('  4. response_type is present: code');
  console.log('  5. override_default_response_type is present: true');
  console.log('  6. state is present: mock-state-token');
  console.log('  7. scope is absent: true (no scope query param)');
}

if (typeof describe !== 'undefined') {
  describe('CrmService Meta OAuth Authorization URL', () => {
    it('generates Facebook Business Login OAuth URL with config_id, override_default_response_type=true, and WITHOUT scope parameter', async () => {
      await runMetaOAuthVerification();
    });
  });
}

if (require.main === module) {
  runMetaOAuthVerification().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
