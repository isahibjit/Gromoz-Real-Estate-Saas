import { ProvisioningType, PaymentCollectionMethod, TenantStatus, SubscriptionStatus } from '../types/platform.types';

export interface ProvisioningLifecycleResult {
  tenantStatus: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  mrr: number;
}

export function resolveProvisioningLifecycle(
  provisioningType: ProvisioningType,
  paymentCollectionMethod?: PaymentCollectionMethod,
  userLicensesCount: number = 0,
  monthlyPricePerUser: number = 0,
  isDraft: boolean = false
): ProvisioningLifecycleResult {
  if (isDraft) {
    return {
      tenantStatus: 'Draft',
      subscriptionStatus: 'Incomplete',
      mrr: 0,
    };
  }

  switch (provisioningType) {
    case 'Free Trial':
      return {
        tenantStatus: 'Trial',
        subscriptionStatus: 'Trialing',
        mrr: 0,
      };

    case 'Payment Required':
      return {
        tenantStatus: 'Pending Payment',
        subscriptionStatus: 'Incomplete',
        mrr: 0,
      };

    case 'Invoice / Offline Payment':
      if (paymentCollectionMethod === 'Record Confirmed Offline Payment') {
        return {
          tenantStatus: 'Active',
          subscriptionStatus: 'Active',
          mrr: userLicensesCount * monthlyPricePerUser,
        };
      }
      return {
        tenantStatus: 'Pending Payment',
        subscriptionStatus: 'Incomplete',
        mrr: 0,
      };

    case 'Enterprise Contract':
      return {
        tenantStatus: 'Pending Payment',
        subscriptionStatus: 'Incomplete',
        mrr: 0,
      };

    default:
      return {
        tenantStatus: 'Pending Payment',
        subscriptionStatus: 'Incomplete',
        mrr: 0,
      };
  }
}
