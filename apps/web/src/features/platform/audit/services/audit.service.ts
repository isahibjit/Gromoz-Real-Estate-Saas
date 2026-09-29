import { api } from '../../../../common/api';

export interface AuditEventSummary {
  id: string;
  createdAt: string;
  schemaVersion: number;
  scope: string;
  eventCode: string;
  action: string;
  category: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
  actorType: string;
  actorUserId: string;
  tenantId: string | null;
  entityType: string | null;
  entityId: string | null;
  correlationId: string | null;
}

export interface AuditEventDetail extends AuditEventSummary {
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  requestId?: string | null;
  originRequestId?: string | null;
  tenantMembershipId?: string | null;
  redactionVersion?: number;
}

export interface AuditQueryFilters {
  tenantId?: string;
  eventCode?: string;
  category?: 'AUTH' | 'RBAC' | 'CATALOG' | 'PLAN' | 'SUBSCRIPTION' | 'PROVISIONING' | 'INDUSTRY' | 'MASTER' | 'MEDIA' | 'JOB';
  outcome?: 'SUCCESS' | 'FAILURE' | 'DENIED';
  actorUserId?: string;
  entityId?: string;
  correlationId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface AuditPageResponse {
  items: AuditEventSummary[];
  nextCursor: string | null;
  hasMore: boolean;
  from: string;
  to: string;
}

class ApiAuditService {
  async getAuditLogs(filters: AuditQueryFilters = {}): Promise<AuditPageResponse> {
    const params: Record<string, any> = {
      limit: filters.limit || 25,
    };
    if (filters.category) params.category = filters.category;
    if (filters.outcome) params.outcome = filters.outcome;
    if (filters.eventCode?.trim()) params.eventCode = filters.eventCode.trim();
    if (filters.tenantId?.trim()) params.tenantId = filters.tenantId.trim();
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.cursor) params.cursor = filters.cursor;

    const response = await api.get<AuditPageResponse>('/platform/audit', { params });
    return response.data;
  }

  async getAuditDetail(id: string): Promise<AuditEventDetail | null> {
    try {
      const response = await api.get<AuditEventDetail>(`/platform/audit/${id}`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }
}

export const auditService = new ApiAuditService();
