import { hashStableJson } from '../../evidence/ai-evidence.service';
import {
  AdapterResult,
  AutomationCatalogJob,
  AutomationDryRunResult,
  AutomationJobOutputResult,
  AutomationJobStatusResult,
  AutomationLaunchActionPayload,
  AutomationJobSummary,
  AutomationLaunchResult,
  AutomationProvider,
  ProviderContext,
} from '../provider.types';
import {
  errorForScenario,
  evidenceSeed,
  MALICIOUS_EXTERNAL_TEXT,
  mockApplicability,
  mockHealth,
  ok,
  providerError,
} from './mock-provider.helpers';

const MAX_OUTPUT_CHARS = 4000;

function scenarioValue(input: unknown): string {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return '';
  }
  const variables = (input as Record<string, unknown>).variables;
  if (variables && typeof variables === 'object' && !Array.isArray(variables)) {
    const scenario = (variables as Record<string, unknown>).scenario;
    return typeof scenario === 'string' ? scenario : '';
  }
  return '';
}

function redactAutomationText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|token|secret|api[-_]?key)\s*[:=]\s*[^ \n\r\t]+/gi, '$1=[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, '[REDACTED_IP]');
}

function boundOutput(value: string): { output: string; truncated: boolean } {
  const redacted = redactAutomationText(value);
  if (redacted.length <= MAX_OUTPUT_CHARS) {
    return { output: redacted, truncated: false };
  }
  return { output: `${redacted.slice(0, MAX_OUTPUT_CHARS - 3)}...`, truncated: true };
}

function providerName(jobOrKey: AutomationCatalogJob | string | null | undefined): string {
  const key = typeof jobOrKey === 'string' ? jobOrKey : jobOrKey?.providerKey;
  return `automation:${key ?? 'mock'}`;
}

function scenarioError<T>(values: string[]): AdapterResult<T> | null {
  for (const value of values) {
    const scenario = errorForScenario<T>(value);
    if (scenario) {
      return scenario;
    }
  }
  return null;
}

export function isAwxLiveDryRunGateEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.KANAP_LIVE_CONTRACT_TESTS === '1'
    && env.KANAP_AWX_LIVE_DRY_RUN === '1'
    && !!env.KANAP_LIVE_TENANT_SLUG
    && !!env.KANAP_AWX_TEST_PROVIDER_KEY
    && !!env.KANAP_AWX_TEST_JOB_KEY
    && !!env.KANAP_AWX_TEST_TARGET;
}

export class MockAutomationProvider implements AutomationProvider {
  readonly kind = 'automation' as const;
  readonly providerKey = 'mock';

  async health(context: ProviderContext) {
    void context;
    return mockHealth(this.kind, this.providerKey);
  }

  async applicability(context: ProviderContext) {
    void context;
    return mockApplicability();
  }

  async listAllowedJobs(
    context: ProviderContext,
    input: { jobs: AutomationCatalogJob[] },
  ): Promise<AdapterResult<{ jobs: AutomationJobSummary[] }>> {
    void context;
    const jobs: AutomationJobSummary[] = input.jobs.map((job) => ({
      jobKey: job.jobKey,
      jobId: job.jobKey,
      name: job.displayName,
      environment: job.environment,
      dryRunSupported: job.dryRunSupported,
      dryRunRequired: job.dryRunRequired,
      launchAllowed: job.launchAllowed,
      catalogVersion: job.catalogVersion,
      liveTestSafety: job.liveTestSafety,
    }));
    return ok({ jobs }, [
      evidenceSeed('automation:mock', 'allowed_jobs', 'catalog', `Listed ${jobs.length} allowlisted automation job(s).`, { jobs }),
    ]);
  }

  async getJobSchema(
    context: ProviderContext,
    input: { job: AutomationCatalogJob },
  ): Promise<AdapterResult<{ jobKey: string; schema: Record<string, unknown> }>> {
    void context;
    const scenario = errorForScenario<{ jobKey: string; schema: Record<string, unknown> }>(input.job.jobKey);
    if (scenario) {
      return scenario;
    }
    const data = {
      jobKey: input.job.jobKey,
      schema: input.job.variableSchema,
    };
    return ok(data, [
      evidenceSeed(providerName(input.job), 'job_schema', input.job.jobKey, `Schema for automation job ${input.job.jobKey}.`, data),
    ]);
  }

  async dryRunJob(
    context: ProviderContext,
    input: {
      job: AutomationCatalogJob;
      target: { type: string; values: string[] };
      variables: Record<string, unknown>;
      dryRunFingerprint: string;
    },
  ): Promise<AdapterResult<AutomationDryRunResult>> {
    void context;
    const scenario = scenarioError<AutomationDryRunResult>([
      input.job.jobKey,
      input.target.values.join(' '),
      scenarioValue(input),
    ]);
    if (scenario) {
      return scenario;
    }
    if (!input.job.dryRunSupported) {
      return providerError<AutomationDryRunResult>('unsafe_operation', 'Mock AWX job does not support check mode.', false);
    }
    const warnings = input.job.jobKey.includes('warning') || input.target.values.some((value) => value.includes('warning'))
      ? ['mock_warning']
      : undefined;
    const dryRunResultHash = hashStableJson({
      dry_run_fingerprint: input.dryRunFingerprint,
      changed: false,
      warnings: warnings ?? [],
    });
    const data: AutomationDryRunResult = {
      dryRunId: `mock-dry-run-${dryRunResultHash.slice(0, 12)}`,
      jobKey: input.job.jobKey,
      providerKey: input.job.providerKey,
      status: 'successful',
      summary: `Mock AWX check completed for ${input.job.jobKey} on ${input.target.values.join(', ')}.`,
      changed: false,
      target: input.target,
      dryRunFingerprint: input.dryRunFingerprint,
      dryRunResultHash,
      warnings,
    };
    return ok(data, [
      evidenceSeed(providerName(input.job), 'job_dry_run', input.job.jobKey, data.summary, {
        providerKey: input.job.providerKey,
        jobKey: input.job.jobKey,
        catalogVersion: input.job.catalogVersion,
        environment: input.job.environment,
        externalJobTemplateRef: input.job.externalJobTemplateRef,
        target: input.target,
        variables: input.variables,
        status: data.status,
        changed: data.changed,
        warnings: warnings ?? [],
        dryRunFingerprint: input.dryRunFingerprint,
        dryRunResultHash,
      }),
    ], warnings);
  }

  async launchApprovedJob(
    context: ProviderContext,
    input: {
      actionPayload: AutomationLaunchActionPayload;
      approvalId: string;
      idempotencyKey: string;
    },
  ): Promise<AdapterResult<AutomationLaunchResult>> {
    void context;
    const scenario = scenarioError<AutomationLaunchResult>([
      input.actionPayload.jobKey,
      input.actionPayload.target.values.join(' '),
      scenarioValue({ variables: input.actionPayload.variables }),
    ]);
    if (scenario) {
      return scenario;
    }
    const alreadyStarted = input.actionPayload.jobKey.includes('already-started')
      || input.idempotencyKey.includes('already-started')
      || input.actionPayload.variables.scenario === 'already-started';
    const runHash = hashStableJson({
      job_key: input.actionPayload.jobKey,
      target: input.actionPayload.target,
      idempotency_key: input.idempotencyKey,
    });
    const data: AutomationLaunchResult = {
      jobRunId: alreadyStarted ? `mock-job-existing-${runHash.slice(0, 10)}` : `mock-job-${runHash.slice(0, 12)}`,
      jobKey: input.actionPayload.jobKey,
      providerKey: input.actionPayload.providerKey,
      status: alreadyStarted ? 'already_started' : 'started',
      summary: alreadyStarted
        ? `Mock AWX job ${input.actionPayload.jobKey} was already started for this idempotency key.`
        : `Mock AWX job ${input.actionPayload.jobKey} started.`,
      idempotencyKey: input.idempotencyKey,
      alreadyStarted,
    };
    return ok(data, [
      evidenceSeed(providerName(input.actionPayload.providerKey), 'job_launch', data.jobRunId, data.summary, {
        jobRunId: data.jobRunId,
        providerKey: data.providerKey,
        jobKey: data.jobKey,
        externalJobTemplateRef: input.actionPayload.externalJobTemplateRef,
        target: input.actionPayload.target,
        status: data.status,
        idempotencyKey: input.idempotencyKey,
        approvalId: input.approvalId,
        alreadyStarted,
      }),
    ], alreadyStarted ? ['already_started'] : undefined);
  }

  async getJobStatus(
    context: ProviderContext,
    input: { jobRunId: string; providerKey?: string | null; jobKey?: string | null },
  ): Promise<AdapterResult<AutomationJobStatusResult>> {
    void context;
    const scenario = errorForScenario<AutomationJobStatusResult>(input.jobRunId);
    if (scenario) {
      return scenario;
    }
    const failed = input.jobRunId.includes('failed');
    const running = input.jobRunId.includes('running');
    const cancelled = input.jobRunId.includes('cancelled');
    const data: AutomationJobStatusResult = {
      jobRunId: input.jobRunId,
      status: failed ? 'failed' : running ? 'running' : cancelled ? 'cancelled' : 'successful',
      summary: failed
        ? 'Mock AWX job failed.'
        : running
          ? 'Mock AWX job is still running.'
          : cancelled
            ? 'Mock AWX job was cancelled.'
            : 'Mock AWX job completed successfully.',
      outcome: failed ? 'provider_job_failed' : running ? null : cancelled ? 'provider_job_cancelled' : 'provider_job_succeeded',
    };
    return ok(data, [
      evidenceSeed(providerName(input.providerKey ?? 'mock'), 'job_status', input.jobRunId, data.summary, {
        ...data,
        jobKey: input.jobKey ?? null,
      }),
    ]);
  }

  async getJobOutput(
    context: ProviderContext,
    input: { jobRunId: string; providerKey?: string | null; jobKey?: string | null },
  ): Promise<AdapterResult<AutomationJobOutputResult>> {
    void context;
    const scenario = errorForScenario<AutomationJobOutputResult>(input.jobRunId);
    if (scenario) {
      return scenario;
    }
    const rawOutput = input.jobRunId.includes('malicious')
      ? `${MALICIOUS_EXTERNAL_TEXT}\nBearer abcdefghijklmnopqrstuvwxyz password=super-secret 192.168.1.10`
      : input.jobRunId.includes('long')
        ? `Mock AWX output\n${'line with routine service check\n'.repeat(300)}`
        : 'Mock AWX output: service check completed without changes.';
    const bounded = boundOutput(rawOutput);
    const data: AutomationJobOutputResult = {
      jobRunId: input.jobRunId,
      output: bounded.output,
      truncated: bounded.truncated,
    };
    return ok(data, [
      evidenceSeed(providerName(input.providerKey ?? 'mock'), 'job_output', input.jobRunId, 'Mock AWX job output captured as untrusted evidence.', {
        ...data,
        jobKey: input.jobKey ?? null,
      }),
    ]);
  }

  async cancelJob(context: ProviderContext, input: { jobRunId: string }): Promise<AdapterResult<{ cancelled: boolean }>> {
    void context;
    return {
      ...providerError<{ cancelled: boolean }>('unsafe_operation', 'Automation cancellation is deferred in Phase 4 unless a future catalog enables it safely.'),
      evidence: [
        evidenceSeed('automation:mock', 'blocked_cancel', input.jobRunId, 'Blocked Phase 4 automation cancellation.', input),
      ],
    };
  }
}
