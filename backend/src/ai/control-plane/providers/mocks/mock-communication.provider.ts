import {
  AdapterResult,
  CommunicationProvider,
  ProviderContext,
} from '../provider.types';
import {
  evidenceSeed,
  mockApplicability,
  mockHealth,
  providerError,
} from './mock-provider.helpers';

export class MockCommunicationProvider implements CommunicationProvider {
  readonly kind = 'communication' as const;
  readonly providerKey = 'mock';

  async health(context: ProviderContext) {
    void context;
    return mockHealth(this.kind, this.providerKey);
  }

  async applicability(context: ProviderContext) {
    void context;
    return mockApplicability();
  }

  async postApprovalRequest(
    context: ProviderContext,
    input: { channelRef: string; templateId: string; actionRequestId: string },
  ): Promise<AdapterResult<{ messageId: string }>> {
    void context;
    return {
      ...providerError<{ messageId: string }>('unsafe_operation', 'Communication writes are not available in Phase 2.'),
      evidence: [
        evidenceSeed('communication:mock', 'blocked_approval_request', input.actionRequestId, 'Blocked Phase 2 approval request notification.', {
          channelRef: input.channelRef,
          templateId: input.templateId,
          actionRequestId: input.actionRequestId,
        }),
      ],
    };
  }

  async postStatusUpdate(
    context: ProviderContext,
    input: { channelRef: string; templateId: string; summary: string },
  ): Promise<AdapterResult<{ messageId: string }>> {
    void context;
    return {
      ...providerError<{ messageId: string }>('unsafe_operation', 'Communication writes are not available in Phase 2.'),
      evidence: [
        evidenceSeed('communication:mock', 'blocked_status_update', input.channelRef, 'Blocked Phase 2 status update notification.', input),
      ],
    };
  }
}
