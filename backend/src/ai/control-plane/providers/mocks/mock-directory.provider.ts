import {
  AdapterResult,
  DirectoryGroupContext,
  DirectoryProvider,
  DirectoryUserContext,
  ProviderContext,
} from '../provider.types';
import {
  errorForScenario,
  evidenceSeed,
  mockApplicability,
  mockHealth,
  ok,
} from './mock-provider.helpers';

export class MockDirectoryProvider implements DirectoryProvider {
  readonly kind = 'directory' as const;
  readonly providerKey = 'mock';

  async health(context: ProviderContext) {
    void context;
    return mockHealth(this.kind, this.providerKey);
  }

  async applicability(context: ProviderContext) {
    void context;
    return mockApplicability();
  }

  async getUserContext(context: ProviderContext, input: { userIdOrEmail: string }): Promise<AdapterResult<DirectoryUserContext>> {
    void context;
    const scenario = errorForScenario<DirectoryUserContext>(input.userIdOrEmail);
    if (scenario) {
      return scenario;
    }
    const data: DirectoryUserContext = {
      userIdOrEmail: input.userIdOrEmail,
      displayName: 'Mock SAP Operator',
      department: 'IT Operations',
      manager: 'Mock Operations Lead',
      groups: ['SAP-Ops-L1', 'Monitoring-Readers'],
      riskNotes: ['Read-only directory context from mock adapter.'],
    };
    return ok(data, [
      evidenceSeed('directory:mock', 'user_context', input.userIdOrEmail, `Directory context for ${input.userIdOrEmail}.`, data),
    ]);
  }

  async getGroupContext(context: ProviderContext, input: { groupIdOrName: string }): Promise<AdapterResult<DirectoryGroupContext>> {
    void context;
    const scenario = errorForScenario<DirectoryGroupContext>(input.groupIdOrName);
    if (scenario) {
      return scenario;
    }
    const data: DirectoryGroupContext = {
      groupIdOrName: input.groupIdOrName,
      displayName: input.groupIdOrName,
      membersCount: 12,
      owners: ['Mock Operations Lead'],
    };
    return ok(data, [
      evidenceSeed('directory:mock', 'group_context', input.groupIdOrName, `Directory group context for ${input.groupIdOrName}.`, data),
    ]);
  }

  async validateIdentityRelation(
    context: ProviderContext,
    input: { userIdOrEmail: string; ticketId?: string | null },
  ): Promise<AdapterResult<{ related: boolean; summary: string }>> {
    void context;
    const scenario = errorForScenario<{ related: boolean; summary: string }>(input.userIdOrEmail);
    if (scenario) {
      return scenario;
    }
    const data = {
      related: true,
      summary: `${input.userIdOrEmail} is in a support group relevant to ${input.ticketId ?? 'the ticket'}.`,
    };
    return ok(data, [
      evidenceSeed('directory:mock', 'identity_relation', input.userIdOrEmail, data.summary, data),
    ]);
  }
}
