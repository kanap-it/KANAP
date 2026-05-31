import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiPolicyService } from '../../ai-policy.service';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AiProviderToolDef } from '../../providers/ai-provider.types';
import { AiCapabilityRegistry, ResolvedCapability } from '../capability/ai-capability.registry';
import { CapabilityContract } from '../capability/capability-contract';
import {
  AiMcpApiKeyPolicy,
  AiMcpApiKeyPolicyRecord,
  AiMcpScope,
  assertMcpScope,
  isMcpCapabilityAllowedByPolicy,
  MCP_SCOPE_AUDIT_READ,
  parseMcpApiKeyPolicy,
} from './ai-mcp-access-policy';

export type AiMcpApiKeyContext = AiMcpApiKeyPolicyRecord & {
  id?: string | null;
  tenant_id?: string | null;
  user_id?: string | null;
  mcp_scopes?: unknown;
  mcp_allowed_capabilities?: unknown;
  mcp_denied_capabilities?: unknown;
};

@Injectable()
export class AiMcpExposureService {
  constructor(
    private readonly registry: AiCapabilityRegistry,
    private readonly policy: AiPolicyService,
  ) {}

  parsePolicy(apiKey: AiMcpApiKeyContext): AiMcpApiKeyPolicy {
    return parseMcpApiKeyPolicy({
      mcp_scopes_json: apiKey.mcp_scopes_json ?? apiKey.mcp_scopes,
      mcp_capability_allowlist_json: apiKey.mcp_capability_allowlist_json ?? apiKey.mcp_allowed_capabilities,
      mcp_capability_denylist_json: apiKey.mcp_capability_denylist_json ?? apiKey.mcp_denied_capabilities,
      mcp_max_effect: apiKey.mcp_max_effect,
      mcp_rate_limit_per_minute: apiKey.mcp_rate_limit_per_minute,
    });
  }

  async listToolJsonSchemas(
    context: AiExecutionContextWithManager,
    apiKey: AiMcpApiKeyContext,
    requiredScope: AiMcpScope,
  ): Promise<AiProviderToolDef[]> {
    await this.assertPostAccess(context, apiKey);
    const keyPolicy = this.assertApiKeyAllowedForContext(context, apiKey, requiredScope);
    const capabilities = await this.registry.listAvailableCapabilities(context);
    const visible: AiProviderToolDef[] = [];

    for (const capability of capabilities) {
      if (await this.isCapabilityVisible(context, capability, keyPolicy)) {
        visible.push({
          name: capability.name,
          description: capability.description,
          parameters: capability.input_schema,
        });
      }
    }

    return visible;
  }

  async assertCanExecute(
    context: AiExecutionContextWithManager,
    apiKey: AiMcpApiKeyContext,
    capabilityName: string,
  ): Promise<ResolvedCapability> {
    await this.assertPostAccess(context, apiKey);
    const keyPolicy = this.assertApiKeyAllowedForContext(context, apiKey, 'mcp:tools:execute');
    const resolved = await this.registry.resolve(context, capabilityName);
    if (!(await this.isCapabilityVisible(context, resolved.contract, keyPolicy))) {
      throw new ForbiddenException('MCP API key is not allowed to execute this capability.');
    }
    return resolved;
  }

  async assertCanReadAudit(
    context: AiExecutionContextWithManager,
    apiKey: AiMcpApiKeyContext,
  ): Promise<AiMcpApiKeyPolicy> {
    await this.assertPostAccess(context, apiKey);
    return this.assertApiKeyAllowedForContext(context, apiKey, MCP_SCOPE_AUDIT_READ);
  }

  async assertPostAccess(
    context: AiExecutionContextWithManager,
    apiKey: AiMcpApiKeyContext,
  ): Promise<void> {
    await this.policy.assertSurfaceAccess(context, context.manager);
    this.assertApiKeyBoundToContext(context, apiKey);
  }

  private assertApiKeyAllowedForContext(
    context: AiExecutionContextWithManager,
    apiKey: AiMcpApiKeyContext,
    scope: AiMcpScope,
  ): AiMcpApiKeyPolicy {
    this.assertApiKeyBoundToContext(context, apiKey);
    const policy = this.parsePolicy(apiKey);
    assertMcpScope(policy, scope);
    return policy;
  }

  private assertApiKeyBoundToContext(
    context: AiExecutionContextWithManager,
    apiKey: AiMcpApiKeyContext,
  ): void {
    if (apiKey.tenant_id && apiKey.tenant_id !== context.tenantId) {
      throw new ForbiddenException('MCP API key tenant mismatch.');
    }
    if (apiKey.user_id && apiKey.user_id !== context.userId) {
      throw new ForbiddenException('MCP API key owner mismatch.');
    }
  }

  private async isCapabilityVisible(
    context: AiExecutionContextWithManager,
    capability: CapabilityContract,
    keyPolicy: AiMcpApiKeyPolicy,
  ): Promise<boolean> {
    if (!capability.supported_surfaces.includes('mcp')) {
      return false;
    }
    if (capability.effect !== 'read' || capability.default_approval !== 'none') {
      return false;
    }
    if (!capability.mcp_exposure.enabled || !capability.mcp_exposure.read_only) {
      return false;
    }
    if (!isMcpCapabilityAllowedByPolicy(keyPolicy, capability.name)) {
      return false;
    }
    for (const resource of capability.business_resources) {
      try {
        await this.policy.assertBusinessPermission(context, resource, 'reader', context.manager);
      } catch {
        return false;
      }
    }
    return true;
  }
}
