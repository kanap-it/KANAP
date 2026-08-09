import { ForbiddenException, Injectable } from '@nestjs/common';
import { AiExecutionContextWithManager } from '../../ai.types';
import { AiModelResolverService } from '../../ai-model-resolver.service';
import { AiBuiltinUsageService } from '../../platform/ai-builtin-usage.service';

// Agent runs on the built-in (free-volume) provider consume the same monthly message
// quota as Plaid chat: one triage run = one included message, reserved before the run
// does any provider or LLM work. Agents assigned (or defaulting to) a registry model
// are unlimited here — the tenant pays its own provider.
@Injectable()
export class AiAgentBuiltinQuotaService {
  constructor(
    private readonly modelResolver: AiModelResolverService,
    private readonly builtinUsage: AiBuiltinUsageService,
  ) {}

  private async usesBuiltinProvider(context: AiExecutionContextWithManager): Promise<boolean> {
    const resolved = await this.modelResolver.tryResolve(
      context.tenantId,
      context.agentId ? { type: 'agent', agentId: context.agentId } : { type: 'chat' },
      context.manager,
    );
    return resolved?.source === 'builtin';
  }

  // Non-consuming gate for the scheduled poller: lets a cycle pause processing with an
  // honest reason instead of starting runs that would fail at reservation time.
  async assertQuotaAvailable(context: AiExecutionContextWithManager): Promise<void> {
    if (!(await this.usesBuiltinProvider(context))) return;
    const usage = await this.builtinUsage.getCurrentUsage(context.tenantId, context.manager);
    if (usage.count >= usage.limit) {
      throw new ForbiddenException('The monthly volume of included AI messages is used up; agent runs resume when it resets.');
    }
  }

  async reserveRun(context: AiExecutionContextWithManager): Promise<void> {
    if (!(await this.usesBuiltinProvider(context))) return;
    const limit = await this.builtinUsage.getMonthlyLimit(context.manager);
    // Detached on purpose: agent runs execute inside a transaction that stays open
    // across their LLM calls; reserving through context.manager would keep the
    // tenant's usage row locked for the whole run and stall every Plaid message.
    await this.builtinUsage.reserveMessageDetached(context.tenantId, limit);
  }
}
