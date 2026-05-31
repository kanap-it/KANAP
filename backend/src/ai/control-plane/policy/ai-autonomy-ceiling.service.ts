import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiExecutionContextWithManager } from '../../ai.types';
import { CapabilityContract } from '../capability/capability-contract';
import { AiApprovalPolicy } from '../entities/ai-approval-policy.entity';
import { AiAutonomyCeiling } from '../entities/ai-autonomy-ceiling.entity';
import {
  autonomyAtLeast,
  autonomyRank,
  minAutonomyLevel,
  requiredAutonomyForEffect,
} from './autonomy-levels';
import { PolicyDecisionReason } from './policy-decision.types';

export type AutonomyCeilingDecision = {
  allowed: boolean;
  effectiveLevel: string | null;
  requiredLevel: string;
  components: Record<string, string | null>;
  reasons: PolicyDecisionReason[];
};

@Injectable()
export class AiAutonomyCeilingService {
  constructor(
    @InjectRepository(AiAutonomyCeiling)
    private readonly ceilingRepo: Repository<AiAutonomyCeiling>,
  ) {}

  private repo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiAutonomyCeiling);
  }

  private strictestLevel(rows: AiAutonomyCeiling[]): string | null {
    return minAutonomyLevel(rows.map((row) => row.max_autonomy_level));
  }

  async resolveEffectiveCeiling(
    context: AiExecutionContextWithManager,
    input: {
      contract: CapabilityContract;
      policy: AiApprovalPolicy;
      environment: string | null;
      providerKind: string | null;
      providerKey: string | null;
    },
  ): Promise<AutonomyCeilingDecision> {
    const reasons: PolicyDecisionReason[] = [];
    const rows = await this.repo(context).find({
      where: {
        tenant_id: context.tenantId,
        enabled: true,
      },
    });
    const tenantRows = rows.filter((row) => row.scope === 'tenant');
    const environmentRows = rows.filter((row) =>
      row.scope === 'environment'
      && row.environment === input.environment
      && (!row.provider_kind || row.provider_kind === input.providerKind)
      && (!row.provider_key || row.provider_key === input.providerKey),
    );
    const capabilityRows = rows.filter((row) =>
      row.scope === 'capability'
      && row.capability_name === input.contract.name
      && (!row.capability_version || row.capability_version === input.contract.version)
      && (!row.provider_kind || row.provider_kind === input.providerKind)
      && (!row.provider_key || row.provider_key === input.providerKey),
    );

    if (tenantRows.length === 0) {
      reasons.push({ code: 'MISSING_TENANT_AUTONOMY_CEILING', detail: 'Tenant autonomy ceiling is not configured.' });
    }
    if (!input.environment || environmentRows.length === 0) {
      reasons.push({ code: 'MISSING_ENVIRONMENT_AUTONOMY_CEILING', detail: 'Environment autonomy ceiling is not configured.' });
    }
    if (capabilityRows.length === 0) {
      reasons.push({ code: 'MISSING_CAPABILITY_AUTONOMY_CEILING', detail: 'Capability autonomy ceiling is not configured.' });
    }

    const levels = [
      ...tenantRows.map((row) => row.max_autonomy_level),
      ...environmentRows.map((row) => row.max_autonomy_level),
      ...capabilityRows.map((row) => row.max_autonomy_level),
      input.contract.max_autonomy_level,
      input.policy.max_autonomy_level,
    ].filter((level): level is string => typeof level === 'string');

    if (levels.some((level) => autonomyRank(level) === null)) {
      reasons.push({ code: 'MALFORMED_AUTONOMY_LEVEL', detail: 'At least one autonomy ceiling level is malformed.' });
    }

    const hasRequiredScopes = tenantRows.length > 0
      && !!input.environment
      && environmentRows.length > 0
      && capabilityRows.length > 0;
    const effectiveLevel = hasRequiredScopes ? minAutonomyLevel(levels) : null;
    const requiredLevel = requiredAutonomyForEffect(input.contract.effect);
    if (effectiveLevel && !autonomyAtLeast(effectiveLevel, requiredLevel)) {
      reasons.push({
        code: 'AUTONOMY_CEILING_TOO_LOW',
        detail: `Effective autonomy ${effectiveLevel} is below required ${requiredLevel}.`,
      });
    }

    return {
      allowed: reasons.length === 0,
      effectiveLevel,
      requiredLevel,
      components: {
        tenant: this.strictestLevel(tenantRows),
        environment: this.strictestLevel(environmentRows),
        capability: this.strictestLevel(capabilityRows),
        contract: input.contract.max_autonomy_level,
        policy: input.policy.max_autonomy_level,
      },
      reasons,
    };
  }
}
