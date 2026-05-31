import { Injectable } from '@nestjs/common';
import { AiExecutionContextWithManager } from '../../ai.types';
import { CapabilityContract } from '../capability/capability-contract';
import { AiActionRequest } from '../entities/ai-action-request.entity';
import { AiApproval } from '../entities/ai-approval.entity';
import { AiApprovalPolicy } from '../entities/ai-approval-policy.entity';
import { AiEvaluation } from '../entities/ai-evaluation.entity';
import { AiEvidence } from '../entities/ai-evidence.entity';
import { AiRecommendation } from '../entities/ai-recommendation.entity';
import { AiToolExecution } from '../entities/ai-tool-execution.entity';
import { PolicyDecisionReason } from './policy-decision.types';

type BudgetConstraints = {
  window_minutes?: number;
  max_failed_actions?: number;
  max_operator_rejections?: number;
  max_provider_errors?: number;
  max_recent_cost?: number;
  cost_json_key?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function numberField(value: Record<string, unknown> | null | undefined, key: string): number | null {
  const raw = value?.[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function budgetConstraints(policy: AiApprovalPolicy): BudgetConstraints {
  return isRecord(policy.budget_constraints_json) ? policy.budget_constraints_json as BudgetConstraints : {};
}

function cutoffMs(windowMinutes: number | null): number {
  return Date.now() - Math.max(windowMinutes ?? 60, 1) * 60_000;
}

function rowTimeMs(value: { created_at?: Date | string | null; executed_at?: Date | string | null }): number {
  const date = value.executed_at ?? value.created_at ?? null;
  if (date instanceof Date) {
    return date.getTime();
  }
  if (typeof date === 'string') {
    const parsed = Date.parse(date);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  return Date.now();
}

function sameActionScope(candidate: AiActionRequest, action: AiActionRequest): boolean {
  return candidate.id !== action.id
    && candidate.capability_name === action.capability_name
    && candidate.capability_version === action.capability_version
    && candidate.provider_kind === action.provider_kind
    && candidate.provider_key === action.provider_key
    && candidate.target_type === action.target_type
    && candidate.target_ref === action.target_ref;
}

function costFromTool(tool: AiToolExecution, key: string): number {
  if (!isRecord(tool.cost_json)) {
    return 0;
  }
  const value = tool.cost_json[key] ?? tool.cost_json.total_cost ?? tool.cost_json.estimated_cost;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

@Injectable()
export class AiAutonomyDemotionService {
  async evaluate(
    context: AiExecutionContextWithManager,
    input: {
      action: AiActionRequest;
      policy: AiApprovalPolicy;
      contract: CapabilityContract;
      evidence: AiEvidence[];
      recommendation: AiRecommendation | null;
      evaluation: AiEvaluation | null;
    },
  ): Promise<PolicyDecisionReason[]> {
    const constraints = budgetConstraints(input.policy);
    const windowMinutes = numberField(constraints as Record<string, unknown>, 'window_minutes') ?? 60;
    const cutoff = cutoffMs(windowMinutes);
    const reasons: PolicyDecisionReason[] = [];

    const actionRepo = context.manager.getRepository(AiActionRequest);
    const approvalRepo = context.manager.getRepository(AiApproval);
    const toolRepo = context.manager.getRepository(AiToolExecution);

    const actions = await actionRepo.find({ where: { tenant_id: context.tenantId } });
    const scopedActions = actions
      .filter((candidate) => sameActionScope(candidate, input.action))
      .filter((candidate) => rowTimeMs(candidate) >= cutoff);

    const failedActions = scopedActions.filter((candidate) => candidate.status === 'failed').length;
    const maxFailedActions = numberField(constraints as Record<string, unknown>, 'max_failed_actions') ?? 0;
    if (failedActions > maxFailedActions) {
      reasons.push({
        code: 'RECENT_FAILED_ACTIONS',
        detail: `Recent failed actions ${failedActions} exceed allowed ${maxFailedActions}.`,
      });
    }

    const rejectedActions = scopedActions.filter((candidate) => candidate.status === 'rejected').length;
    const approvals = await approvalRepo.find({ where: { tenant_id: context.tenantId } });
    const rejectedApprovals = approvals.filter((approval) =>
      approval.status === 'rejected'
      && approval.capability_name === input.action.capability_name
      && approval.capability_version === input.action.capability_version
      && rowTimeMs(approval) >= cutoff,
    ).length;
    const maxOperatorRejections = numberField(constraints as Record<string, unknown>, 'max_operator_rejections') ?? 0;
    if (rejectedActions + rejectedApprovals > maxOperatorRejections) {
      reasons.push({
        code: 'RECENT_OPERATOR_REJECTIONS',
        detail: `Recent operator rejections ${rejectedActions + rejectedApprovals} exceed allowed ${maxOperatorRejections}.`,
      });
    }

    if (input.policy.min_confidence !== null && input.policy.min_confidence !== undefined) {
      const confidence = input.recommendation?.confidence ?? null;
      if (confidence === null || confidence < input.policy.min_confidence) {
        reasons.push({
          code: 'LOW_RECOMMENDATION_CONFIDENCE',
          detail: `Recommendation confidence ${confidence ?? 'missing'} is below required ${input.policy.min_confidence}.`,
        });
      }
    }

    if (input.evidence.length === 0) {
      reasons.push({ code: 'MISSING_POLICY_EVIDENCE', detail: 'Policy approval requires evidence.' });
    }
    if (input.evidence.some((row) => row.trust_level === 'external' || row.trust_level === 'model_generated')) {
      reasons.push({
        code: 'WEAK_EVIDENCE_TRUST',
        detail: 'External or model-generated evidence cannot be the sole basis for policy approval.',
      });
    }

    const tools = await toolRepo.find({
      where: {
        tenant_id: context.tenantId,
        capability_name: input.contract.name,
        capability_version: input.contract.version,
      },
    });
    const recentTools = tools.filter((tool) => rowTimeMs(tool) >= cutoff);
    const providerErrors = recentTools.filter((tool) => tool.status === 'failed' || tool.status === 'provider_error').length;
    const maxProviderErrors = numberField(constraints as Record<string, unknown>, 'max_provider_errors') ?? 0;
    if (providerErrors > maxProviderErrors) {
      reasons.push({
        code: 'RECENT_PROVIDER_ERRORS',
        detail: `Recent provider errors ${providerErrors} exceed allowed ${maxProviderErrors}.`,
      });
    }

    const maxRecentCost = numberField(constraints as Record<string, unknown>, 'max_recent_cost');
    if (maxRecentCost !== null) {
      const costKey = typeof constraints.cost_json_key === 'string' ? constraints.cost_json_key : 'total_cost';
      const recentCost = recentTools.reduce((sum, tool) => sum + costFromTool(tool, costKey), 0);
      if (recentCost > maxRecentCost) {
        reasons.push({
          code: 'RECENT_COST_ANOMALY',
          detail: `Recent cost ${recentCost} exceeds allowed ${maxRecentCost}.`,
        });
      }
    }

    if (input.policy.cooldown_seconds > 0) {
      const cooldownCutoff = Date.now() - input.policy.cooldown_seconds * 1000;
      const recentExecuted = scopedActions.some((candidate) =>
        candidate.status === 'executed' && rowTimeMs(candidate) >= cooldownCutoff,
      );
      if (recentExecuted) {
        reasons.push({
          code: 'POLICY_COOLDOWN_ACTIVE',
          detail: 'Policy cooldown is active for this capability and target.',
        });
      }
    }

    return reasons;
  }
}
