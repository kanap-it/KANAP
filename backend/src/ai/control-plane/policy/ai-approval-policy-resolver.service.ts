import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiExecutionContextWithManager } from '../../ai.types';
import {
  actionClassForCapabilityName,
  isAgentAutonomyPolicyMetadata,
  isLowRiskAutomationActionClass,
} from '../agent/ai-agent-autonomy';
import { CapabilityContract, CapabilityExecutionContext, CapabilitySurface } from '../capability/capability-contract';
import { AiActionRequest } from '../entities/ai-action-request.entity';
import { AiApprovalPolicy } from '../entities/ai-approval-policy.entity';
import { AiEvaluation } from '../entities/ai-evaluation.entity';
import { AiEvidence } from '../entities/ai-evidence.entity';
import { AiRecommendation } from '../entities/ai-recommendation.entity';
import { AiAutonomyCeilingService } from './ai-autonomy-ceiling.service';
import { AiAutonomyDemotionService } from './ai-autonomy-demotion.service';
import { autonomyRank } from './autonomy-levels';
import { PolicyDecisionReason, PolicyDecisionRecord } from './policy-decision.types';

type EvidenceRequirements = {
  min_count?: number;
  required_ids?: string[];
  trust_levels?: string[];
  source_providers?: string[];
};

type EvaluationRequirements = {
  min_score?: number;
  score_key?: string;
  required_status?: string;
  allowed_outcomes?: string[];
};

type TargetConstraints = {
  allowed_refs?: string[];
  allowed_patterns?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asObject<T>(value: unknown): T | null {
  return isRecord(value) ? value as T : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim())
    : [];
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function actionMetadata(action: AiActionRequest): Record<string, unknown> {
  return isRecord(action.metadata_json) ? action.metadata_json : {};
}

function actionPayload(action: AiActionRequest): Record<string, unknown> {
  return isRecord(action.action_payload_json) ? action.action_payload_json : {};
}

function metadataString(value: Record<string, unknown>, key: string): string | null {
  const raw = value[key];
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function nestedMetadataString(value: Record<string, unknown>, parent: string, key: string): string | null {
  const nested = value[parent];
  return isRecord(nested) ? metadataString(nested, key) : null;
}

function resolveActionEnvironment(action: AiActionRequest, policy: AiApprovalPolicy): string | null {
  const metadata = actionMetadata(action);
  const payload = actionPayload(action);
  return metadataString(payload, 'environment')
    ?? nestedMetadataString(metadata, 'automation', 'environment')
    ?? metadataString(metadata, 'environment')
    ?? policy.environment
    ?? (action.provider_key === 'mock' ? 'mock' : null);
}

function compilePolicyPattern(pattern: string): RegExp | null {
  if (pattern.length > 128 || /\\[1-9]/.test(pattern) || /\([^)]*[+*][^)]*\)\s*(?:[+*]|\{\d)/.test(pattern)) {
    return null;
  }
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

function uniqueReasons(reasons: PolicyDecisionReason[]): PolicyDecisionReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = `${reason.code}:${reason.detail}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function failedDecision(
  outcome: 'human_required' | 'system_rejected',
  reasons: PolicyDecisionReason[],
  execution?: Partial<CapabilityExecutionContext> | null,
): PolicyDecisionRecord {
  return {
    outcome,
    approved: false,
    reasons: uniqueReasons(reasons.map((reason) => ({ severity: 'deny', ...reason }))),
    surface: execution?.surface ?? null,
    trigger_kind: execution?.trigger_kind ?? null,
  };
}

@Injectable()
export class AiApprovalPolicyResolverService {
  constructor(
    @InjectRepository(AiApprovalPolicy)
    private readonly policyRepo: Repository<AiApprovalPolicy>,
    private readonly ceilings: AiAutonomyCeilingService,
    private readonly demotion: AiAutonomyDemotionService,
  ) {}

  private repo(context: AiExecutionContextWithManager) {
    return context.manager.getRepository(AiApprovalPolicy);
  }

  private async loadEvidence(context: AiExecutionContextWithManager, action: AiActionRequest): Promise<{
    rows: AiEvidence[];
    reasons: PolicyDecisionReason[];
  }> {
    const evidenceIds = Array.isArray(action.evidence_ids)
      ? action.evidence_ids.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      : [];
    if (evidenceIds.length === 0) {
      return {
        rows: [],
        reasons: [{ code: 'MISSING_EVIDENCE_IDS', detail: 'Action request has no evidence ids.' }],
      };
    }
    const rows = await context.manager.getRepository(AiEvidence).find({
      where: { tenant_id: context.tenantId },
    });
    const matching = rows.filter((row) => evidenceIds.includes(row.id));
    const reasons: PolicyDecisionReason[] = [];
    if (matching.length !== new Set(evidenceIds).size) {
      reasons.push({
        code: 'EVIDENCE_NOT_FOUND_OR_CROSS_TENANT',
        detail: 'One or more action evidence ids were not visible for this tenant.',
      });
    }
    return { rows: matching, reasons };
  }

  private async loadRecommendation(context: AiExecutionContextWithManager, action: AiActionRequest): Promise<AiRecommendation | null> {
    const recommendationId = metadataString(actionMetadata(action), 'recommendation_id');
    if (!recommendationId) {
      return null;
    }
    return context.manager.getRepository(AiRecommendation).findOne({
      where: { id: recommendationId, tenant_id: context.tenantId },
    });
  }

  private async loadEvaluation(context: AiExecutionContextWithManager, action: AiActionRequest): Promise<AiEvaluation | null> {
    const evaluationId = metadataString(actionMetadata(action), 'evaluation_id');
    if (!evaluationId) {
      return null;
    }
    return context.manager.getRepository(AiEvaluation).findOne({
      where: { id: evaluationId, tenant_id: context.tenantId },
    });
  }

  private validatePolicyShape(policy: AiApprovalPolicy): PolicyDecisionReason[] {
    const reasons: PolicyDecisionReason[] = [];
    const agentAutonomyMetadata = isAgentAutonomyPolicyMetadata(policy.metadata_json) ? policy.metadata_json : null;
    if (!policy.enabled) {
      reasons.push({ code: 'POLICY_DISABLED', detail: `Policy ${policy.policy_key} is disabled.` });
    }
    if (policy.status !== 'enabled') {
      reasons.push({ code: 'POLICY_NOT_ENABLED', detail: `Policy ${policy.policy_key} status is ${policy.status}.` });
    }
    if (!policy.policy_key || !Number.isInteger(policy.policy_version) || policy.policy_version < 1) {
      reasons.push({ code: 'MALFORMED_POLICY_VERSION', detail: 'Policy key/version is incomplete.' });
    }
    if (autonomyRank(policy.max_autonomy_level) === null) {
      reasons.push({ code: 'MALFORMED_POLICY_AUTONOMY', detail: 'Policy autonomy level is malformed.' });
    }
    if (!policy.target_type || !isRecord(policy.target_constraints_json)) {
      reasons.push({ code: 'MALFORMED_POLICY_TARGET', detail: 'Policy target constraints are incomplete.' });
    } else {
      const target = asObject<TargetConstraints>(policy.target_constraints_json);
      if (stringArray(target?.allowed_refs).length === 0 && stringArray(target?.allowed_patterns).length === 0) {
        reasons.push({ code: 'MALFORMED_POLICY_TARGET', detail: 'Policy target constraints must include allowed refs or patterns.' });
      }
    }
    if (policy.evidence_requirements_json !== null && !isRecord(policy.evidence_requirements_json)) {
      reasons.push({ code: 'MALFORMED_POLICY_EVIDENCE', detail: 'Policy evidence requirements must be an object.' });
    }
    if (policy.evaluation_requirements_json !== null && !isRecord(policy.evaluation_requirements_json)) {
      reasons.push({ code: 'MALFORMED_POLICY_EVALUATION', detail: 'Policy evaluation requirements must be an object.' });
    }
    if (policy.budget_constraints_json !== null && !isRecord(policy.budget_constraints_json)) {
      reasons.push({ code: 'MALFORMED_POLICY_BUDGET', detail: 'Policy budget constraints must be an object.' });
    }
    if (
      policy.live_test_safety !== 'mock_only'
      && !(
        agentAutonomyMetadata
        && policy.live_test_safety === 'live_write_gated'
        && isLowRiskAutomationActionClass(agentAutonomyMetadata.action_class)
      )
    ) {
      reasons.push({ code: 'LIVE_POLICY_NOT_MOCK_ONLY', detail: 'Phase 6 policy approval is limited to mock-only safety.' });
    }
    return reasons;
  }

  private matchPolicy(
    policy: AiApprovalPolicy,
    action: AiActionRequest,
    contract: CapabilityContract,
    execution: Partial<CapabilityExecutionContext> | null | undefined,
    environment: string | null,
  ): PolicyDecisionReason[] {
    const reasons: PolicyDecisionReason[] = [];
    const agentAutonomyMetadata = isAgentAutonomyPolicyMetadata(policy.metadata_json) ? policy.metadata_json : null;
    if (policy.capability_name !== contract.name || policy.capability_version !== contract.version) {
      reasons.push({ code: 'POLICY_CAPABILITY_MISMATCH', detail: 'Policy capability does not match action capability.' });
    }
    if (policy.effect !== contract.effect || action.effect !== contract.effect) {
      reasons.push({ code: 'POLICY_EFFECT_MISMATCH', detail: 'Policy effect does not match action effect.' });
    }
    if (policy.provider_kind && policy.provider_kind !== action.provider_kind) {
      reasons.push({ code: 'POLICY_PROVIDER_KIND_MISMATCH', detail: 'Policy provider kind does not match action provider kind.' });
    }
    if (policy.provider_key && policy.provider_key !== action.provider_key) {
      reasons.push({ code: 'POLICY_PROVIDER_KEY_MISMATCH', detail: 'Policy provider key does not match action provider key.' });
    }
    if (policy.environment && policy.environment !== environment) {
      reasons.push({ code: 'POLICY_ENVIRONMENT_MISMATCH', detail: 'Policy environment does not match action environment.' });
    }
    if (environment === 'production' && !agentAutonomyMetadata) {
      reasons.push({ code: 'PRODUCTION_AUTONOMY_DISABLED', detail: 'Production policy autonomy is deferred for Phase 6.' });
    }
    if (policy.trigger_surface && policy.trigger_surface !== execution?.surface) {
      reasons.push({ code: 'POLICY_SURFACE_MISMATCH', detail: 'Policy trigger surface does not match execution surface.' });
    }
    if (policy.trigger_kind && policy.trigger_kind !== execution?.trigger_kind) {
      reasons.push({ code: 'POLICY_TRIGGER_KIND_MISMATCH', detail: 'Policy trigger kind does not match execution trigger kind.' });
    }
    if (policy.target_type !== action.target_type) {
      reasons.push({ code: 'POLICY_TARGET_TYPE_MISMATCH', detail: 'Policy target type does not match action target type.' });
    }
    const constraints = asObject<TargetConstraints>(policy.target_constraints_json);
    const targetRef = action.target_ref ?? '';
    const allowedRefs = stringArray(constraints?.allowed_refs);
    const allowedPatterns = stringArray(constraints?.allowed_patterns);
    if (allowedRefs.length > 0 && !allowedRefs.includes(targetRef)) {
      reasons.push({ code: 'POLICY_TARGET_REF_DENIED', detail: 'Action target ref is not explicitly allowed by policy.' });
    } else if (allowedRefs.length === 0 && allowedPatterns.length > 0) {
      const compiled = allowedPatterns.map(compilePolicyPattern);
      if (compiled.some((pattern) => pattern === null)) {
        reasons.push({ code: 'MALFORMED_POLICY_TARGET_PATTERN', detail: 'Policy contains an unsafe or invalid target pattern.' });
      } else if (!compiled.some((pattern) => pattern?.test(targetRef))) {
        reasons.push({ code: 'POLICY_TARGET_REF_DENIED', detail: 'Action target ref does not match an allowed policy pattern.' });
      }
    }
    const payloadLiveSafety = metadataString(actionPayload(action), 'liveTestSafety');
    if (payloadLiveSafety && payloadLiveSafety !== policy.live_test_safety) {
      reasons.push({ code: 'LIVE_TEST_SAFETY_MISMATCH', detail: 'Action live-test safety does not match policy.' });
    }
    if (policy.live_test_safety === 'mock_only' && action.provider_key !== 'mock') {
      reasons.push({ code: 'MOCK_ONLY_POLICY_PROVIDER_DENIED', detail: 'Mock-only policy approval requires a mock-safe provider action.' });
    }
    if (agentAutonomyMetadata) {
      const metadata = actionMetadata(action);
      const actionAgentDefinitionId = metadataString(metadata, 'agent_definition_id');
      const actionClass = actionClassForCapabilityName(metadataString(metadata, 'action_class') ?? action.capability_name);
      if (agentAutonomyMetadata.agent_definition_id !== actionAgentDefinitionId) {
        reasons.push({
          code: 'AGENT_AUTONOMY_AGENT_MISMATCH',
          detail: 'Agent autonomy policy does not match the action agent definition.',
        });
      }
      if (agentAutonomyMetadata.action_class !== actionClass) {
        reasons.push({
          code: 'AGENT_AUTONOMY_CLASS_MISMATCH',
          detail: 'Agent autonomy policy does not match the action class.',
        });
      }
      if (!isLowRiskAutomationActionClass(actionClass)) {
        reasons.push({
          code: 'AGENT_AUTONOMY_CLASS_NOT_ALLOWLISTED',
          detail: 'Action class is not allowlisted for automatic agent execution.',
        });
      }
      if (policy.live_test_safety !== 'live_write_gated') {
        reasons.push({
          code: 'AGENT_AUTONOMY_LIVE_SAFETY_REQUIRED',
          detail: 'Agent autonomy policies must use live-write-gated safety.',
        });
      }
    }
    return reasons;
  }

  private checkEvidence(
    policy: AiApprovalPolicy,
    action: AiActionRequest,
    evidence: AiEvidence[],
  ): PolicyDecisionReason[] {
    const requirements = asObject<EvidenceRequirements>(policy.evidence_requirements_json) ?? {};
    const reasons: PolicyDecisionReason[] = [];
    const minCount = numberValue(requirements.min_count) ?? 1;
    if (evidence.length < minCount) {
      reasons.push({ code: 'INSUFFICIENT_EVIDENCE', detail: `Evidence count ${evidence.length} is below required ${minCount}.` });
    }
    const actionEvidenceIds = new Set(Array.isArray(action.evidence_ids) ? action.evidence_ids : []);
    for (const requiredId of stringArray(requirements.required_ids)) {
      if (!actionEvidenceIds.has(requiredId)) {
        reasons.push({ code: 'REQUIRED_EVIDENCE_MISSING', detail: `Required evidence id ${requiredId} is missing.` });
      }
    }
    const trustLevels = stringArray(requirements.trust_levels);
    if (trustLevels.length > 0 && evidence.some((row) => !trustLevels.includes(row.trust_level))) {
      reasons.push({ code: 'EVIDENCE_TRUST_DENIED', detail: 'At least one evidence row has an unapproved trust level.' });
    }
    const sourceProviders = stringArray(requirements.source_providers);
    if (sourceProviders.length > 0 && evidence.some((row) => !sourceProviders.includes(row.source_provider))) {
      reasons.push({ code: 'EVIDENCE_SOURCE_DENIED', detail: 'At least one evidence row has an unapproved source provider.' });
    }
    return reasons;
  }

  private checkEvaluation(
    policy: AiApprovalPolicy,
    recommendation: AiRecommendation | null,
    evaluation: AiEvaluation | null,
  ): PolicyDecisionReason[] {
    const reasons: PolicyDecisionReason[] = [];
    if (policy.min_confidence !== null && policy.min_confidence !== undefined) {
      const confidence = recommendation?.confidence ?? null;
      if (confidence === null || confidence < policy.min_confidence) {
        reasons.push({
          code: 'LOW_CONFIDENCE',
          detail: `Recommendation confidence ${confidence ?? 'missing'} is below required ${policy.min_confidence}.`,
        });
      }
    }

    const requirements = asObject<EvaluationRequirements>(policy.evaluation_requirements_json) ?? {};
    const requiredStatus = typeof requirements.required_status === 'string' ? requirements.required_status : null;
    if (requiredStatus && evaluation?.status !== requiredStatus) {
      reasons.push({ code: 'EVALUATION_STATUS_DENIED', detail: `Evaluation status must be ${requiredStatus}.` });
    }
    const allowedOutcomes = stringArray(requirements.allowed_outcomes);
    if (allowedOutcomes.length > 0 && (!evaluation?.outcome || !allowedOutcomes.includes(evaluation.outcome))) {
      reasons.push({ code: 'EVALUATION_OUTCOME_DENIED', detail: 'Evaluation outcome is not allowed by policy.' });
    }
    const minScore = numberValue(requirements.min_score);
    if (minScore !== null) {
      const scoreKey = typeof requirements.score_key === 'string' ? requirements.score_key : 'overall';
      const scores = isRecord(evaluation?.scores_json) ? evaluation?.scores_json : null;
      const score = scores ? numberValue(scores[scoreKey]) : null;
      if (score === null || score < minScore) {
        reasons.push({ code: 'EVALUATION_SCORE_LOW', detail: `Evaluation score ${score ?? 'missing'} is below required ${minScore}.` });
      }
    }
    return reasons;
  }

  async resolve(
    context: AiExecutionContextWithManager,
    action: AiActionRequest,
    contract: CapabilityContract,
    execution?: Partial<CapabilityExecutionContext> | null,
  ): Promise<PolicyDecisionRecord> {
    const surface = execution?.surface as CapabilitySurface | undefined;
    if (surface === 'chat' || surface === 'mcp') {
      return failedDecision('human_required', [{
        code: 'HUMAN_APPROVAL_REQUIRED_FOR_SURFACE',
        detail: 'Chat and MCP surfaces cannot receive silent policy approval.',
      }], execution);
    }
    if (action.tenant_id !== context.tenantId) {
      return failedDecision('system_rejected', [{
        code: 'ACTION_TENANT_MISMATCH',
        detail: 'Action request belongs to another tenant.',
      }], execution);
    }
    if (action.status !== 'pending') {
      return failedDecision('system_rejected', [{
        code: 'ACTION_NOT_PENDING',
        detail: `Only pending action requests can be policy-approved; current status is ${action.status}.`,
      }], execution);
    }
    if (action.expires_at && action.expires_at <= new Date()) {
      return failedDecision('system_rejected', [{
        code: 'ACTION_EXPIRED',
        detail: 'Action request expired before policy approval.',
      }], execution);
    }
    if (
      action.capability_name !== contract.name
      || action.capability_version !== contract.version
      || action.effect !== contract.effect
    ) {
      return failedDecision('system_rejected', [{
        code: 'ACTION_CONTRACT_MISMATCH',
        detail: 'Action request does not match executing capability contract.',
      }], execution);
    }

    const policies = await this.repo(context).find({ where: { tenant_id: context.tenantId } });
    if (policies.length === 0) {
      return failedDecision('system_rejected', [{
        code: 'NO_POLICY',
        detail: 'No tenant approval policy exists for policy approval.',
      }], execution);
    }

    const evidenceResult = await this.loadEvidence(context, action);
    const recommendation = await this.loadRecommendation(context, action);
    const evaluation = await this.loadEvaluation(context, action);
    const allReasons: PolicyDecisionReason[] = [];
    const sortedPolicies = [...policies].sort((a, b) => b.policy_version - a.policy_version);

    for (const policy of sortedPolicies) {
      const environment = resolveActionEnvironment(action, policy);
      const reasons: PolicyDecisionReason[] = [
        ...this.validatePolicyShape(policy),
        ...this.matchPolicy(policy, action, contract, execution, environment),
        ...evidenceResult.reasons,
        ...this.checkEvidence(policy, action, evidenceResult.rows),
        ...this.checkEvaluation(policy, recommendation, evaluation),
      ];
      const ceiling = await this.ceilings.resolveEffectiveCeiling(context, {
        contract,
        policy,
        environment,
        providerKind: action.provider_kind,
        providerKey: action.provider_key,
      });
      reasons.push(...ceiling.reasons);
      if (reasons.length === 0) {
        reasons.push(...await this.demotion.evaluate(context, {
          action,
          policy,
          contract,
          evidence: evidenceResult.rows,
          recommendation,
          evaluation,
        }));
      }
      if (reasons.length === 0) {
        return {
          outcome: 'policy_approved',
          approved: true,
          reasons: [],
          matched_policy_id: policy.id,
          matched_policy_key: policy.policy_key,
          matched_policy_version: policy.policy_version,
          effective_autonomy_level: ceiling.effectiveLevel,
          required_autonomy_level: ceiling.requiredLevel,
          autonomy_components: ceiling.components,
          evidence_ids: evidenceResult.rows.map((row) => row.id),
          surface: execution?.surface ?? null,
          trigger_kind: execution?.trigger_kind ?? null,
        };
      }
      allReasons.push(...reasons);
    }

    return failedDecision('system_rejected', allReasons.length > 0 ? allReasons : [{
      code: 'POLICY_DENIED',
      detail: 'No policy approved this action request.',
    }], execution);
  }
}
