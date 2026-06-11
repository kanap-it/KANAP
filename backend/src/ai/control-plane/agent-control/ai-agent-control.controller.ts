import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { validate as isUuid } from 'uuid';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../../../common/skip-tenant-transaction.decorator';
import { AiExecutionContext, AiExecutionContextWithManager } from '../../ai.types';
import { AiPolicyService } from '../../ai-policy.service';
import { AiTenantExecutionService } from '../../execution/ai-tenant-execution.service';
import { AiAgentHelpdeskGlpiIngestionService } from '../agent/ai-agent-helpdesk-glpi-ingestion.service';
import {
  AiAgentWorkQueueService,
  HelpdeskGlpiIngestionSettingsInput,
} from '../agent/ai-agent-work-queue.service';
import { AiEmergencyPauseService } from '../pause/ai-emergency-pause.service';
import {
  AgentControlGlpiReadInput,
  AgentControlGlpiTriageInput,
  AgentControlMockTriageInput,
  AiAgentControlService,
} from './ai-agent-control.service';

function parseLimit(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
}

@Controller('ai/admin/control-plane')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiAgentControlController {
  constructor(
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
    private readonly control: AiAgentControlService,
    private readonly glpiIngestion: AiAgentHelpdeskGlpiIngestionService,
    private readonly workQueue: AiAgentWorkQueueService,
    private readonly emergencyPause: AiEmergencyPauseService,
  ) {}

  private buildContext(req: any): AiExecutionContext {
    const tenantId = req?.tenant?.id ? String(req.tenant.id) : '';
    if (!tenantId || !isUuid(tenantId)) {
      throw new ForbiddenException('Valid tenant context is required.');
    }

    return {
      tenantId,
      userId: String(req?.user?.sub || ''),
      isPlatformHost: req?.isPlatformHost === true,
      surface: 'chat',
      authMethod: 'jwt',
      requestId: req?.id ?? null,
      aiApiKeyId: null,
    };
  }

  private async runRead<T>(
    context: AiExecutionContext,
    fn: (context: AiExecutionContextWithManager) => Promise<T>,
  ): Promise<T> {
    return this.tenantExecutor.run(
      context.tenantId,
      async (manager) => {
        await this.policy.assertSettingsAccess(context, manager);
        return fn({ ...context, manager });
      },
      { transaction: false },
    );
  }

  private async runWrite<T>(
    context: AiExecutionContext,
    fn: (context: AiExecutionContextWithManager) => Promise<T>,
  ): Promise<T> {
    return this.tenantExecutor.run(
      context.tenantId,
      async (manager) => {
        await this.policy.assertSettingsAccess(context, manager);
        return fn({ ...context, manager });
      },
    );
  }

  @Get('runs')
  async listRuns(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.listRuns(tenantContext, {
      limit: parseLimit(limit, 25),
      status: status ?? null,
    }));
  }

  @Get('runs/:id')
  async getRun(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.getRunDetail(tenantContext, id));
  }

  @Get('actions')
  async listActions(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.listActionRequests(tenantContext, {
      limit: parseLimit(limit, 50),
      status: status ?? 'pending',
    }));
  }

  @Get('queue')
  async getQueueOverview(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.getQueueOverview(tenantContext, {
      limit: parseLimit(limit, 50),
    }));
  }

  @Get('queue/work-items/:id/helpdesk-context')
  async getHelpdeskWorkItemContext(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, (tenantContext) => this.control.getHelpdeskWorkItemContext(tenantContext, id));
  }

  @Post('uat/mock-triage')
  async runMockTriage(
    @Req() req: any,
    @Body() body: AgentControlMockTriageInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, (tenantContext) => this.control.runMockTriage(tenantContext, body ?? {}));
  }

  @Get('uat/glpi-read/targets')
  async listGlpiReadTargets(
    @Req() req: any,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.listGlpiReadTargets(tenantContext));
  }

  @Post('uat/glpi-read')
  async runGlpiRead(
    @Req() req: any,
    @Body() body: AgentControlGlpiReadInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, (tenantContext) => this.control.runGlpiRead(tenantContext, body ?? {}));
  }

  @Post('uat/glpi-triage')
  async runGlpiTriage(
    @Req() req: any,
    @Body() body: AgentControlGlpiTriageInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, (tenantContext) => this.control.runGlpiTriage(tenantContext, body ?? {}));
  }

  @Post('helpdesk/glpi-ingestion/poll')
  async pollHelpdeskGlpiIngestion(
    @Req() req: any,
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, (tenantContext) => this.glpiIngestion.pollTenant(tenantContext));
  }

  @Get('helpdesk/glpi-ingestion/settings')
  async getHelpdeskGlpiIngestionSettings(
    @Req() req: any,
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, async (tenantContext) => {
      const settings = await this.workQueue.getHelpdeskGlpiIngestionSettings(tenantContext);
      const activePause = await this.emergencyPause.findActiveTenantWidePause(tenantContext);
      return { ...settings, emergency_pause: this.pauseView(activePause) };
    });
  }

  @Post('helpdesk/glpi-ingestion/settings')
  async updateHelpdeskGlpiIngestionSettings(
    @Req() req: any,
    @Body() body: HelpdeskGlpiIngestionSettingsInput,
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, async (tenantContext) => {
      const settings = await this.workQueue.updateHelpdeskGlpiIngestionSettings(tenantContext, body);
      const activePause = await this.emergencyPause.findActiveTenantWidePause(tenantContext);
      return { ...settings, emergency_pause: this.pauseView(activePause) };
    });
  }

  @Post('helpdesk/emergency-pause')
  async createHelpdeskEmergencyPause(
    @Req() req: any,
    @Body() body: { reason?: string; expires_in_minutes?: number | null } = {},
  ) {
    const context = this.buildContext(req);
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      throw new ForbiddenException('An emergency pause requires an explicit reason.');
    }
    const expiresInMinutes = typeof body?.expires_in_minutes === 'number'
      && Number.isFinite(body.expires_in_minutes) && body.expires_in_minutes > 0
      ? Math.min(Math.floor(body.expires_in_minutes), 7 * 24 * 60)
      : null;
    return this.runWrite(context, async (tenantContext) => {
      const pause = await this.emergencyPause.createPause(tenantContext, {
        scope: 'tenant',
        reason,
        expiresAt: expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60_000) : null,
      });
      await this.recordPauseAudit(tenantContext, 'emergency_pause_created', `Tenant emergency pause activated: ${reason}`, pause.id);
      return this.pauseView(pause);
    });
  }

  @Post('helpdesk/emergency-pause/:id/revoke')
  async revokeHelpdeskEmergencyPause(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, async (tenantContext) => {
      const pause = await this.emergencyPause.revokePause(tenantContext, id);
      await this.recordPauseAudit(tenantContext, 'emergency_pause_revoked', `Tenant emergency pause lifted: ${pause.reason}`, pause.id);
      return this.pauseView(pause);
    });
  }

  private pauseView(pause: { id: string; active: boolean; reason: string; created_at?: Date | null; expires_at?: Date | null } | null) {
    if (!pause) {
      return null;
    }
    return {
      id: pause.id,
      active: pause.active,
      reason: pause.reason,
      created_at: pause.created_at ? new Date(pause.created_at).toISOString() : null,
      expires_at: pause.expires_at ? new Date(pause.expires_at).toISOString() : null,
    };
  }

  private async recordPauseAudit(
    tenantContext: AiExecutionContextWithManager,
    eventType: 'emergency_pause_created' | 'emergency_pause_revoked',
    message: string,
    pauseId: string,
  ): Promise<void> {
    const { definition } = await this.workQueue.ensureHelpdeskGlpiTriageDefinition(tenantContext);
    await this.workQueue.recordAuditEvent(tenantContext, {
      agentDefinitionId: definition.id,
      eventType,
      severity: 'warning',
      message,
      metadata: { pause_id: pauseId },
    });
  }

  @Post('actions/:id/approve')
  async approveAction(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { execute?: boolean | null } = {},
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, (tenantContext) => this.control.approveActionRequest(tenantContext, id, {
      execute: body?.execute,
    }));
  }

  @Post('actions/:id/reject')
  async rejectAction(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { reason?: string | null } = {},
  ) {
    const context = this.buildContext(req);
    return this.runWrite(context, (tenantContext) => this.control.rejectActionRequest(
      tenantContext,
      id,
      body?.reason ?? null,
    ));
  }
}
