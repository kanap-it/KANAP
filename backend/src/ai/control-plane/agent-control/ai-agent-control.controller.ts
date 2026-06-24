import {
  Body,
  Controller,
  Delete,
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
  AgentControlActivityType,
  AgentControlAgentDefinitionInput,
  AgentControlAgentStatusInput,
  AgentControlAutonomyInput,
  AgentControlTargetingPreviewInput,
  AiAgentControlService,
} from './ai-agent-control.service';

function parseLimit(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
}

function parseActivityTypes(value: unknown): AgentControlActivityType[] | null {
  if (typeof value !== 'string' && !Array.isArray(value)) return null;
  const rawValues = Array.isArray(value) ? value : value.split(',');
  const allowed = new Set(['proposal', 'decision', 'execution', 'configuration', 'pause', 'error']);
  const parsed = rawValues
    .map((entry) => String(entry).trim())
    .filter((entry): entry is AgentControlActivityType => allowed.has(entry));
  return parsed.length > 0 ? Array.from(new Set(parsed)) : null;
}

type AgentControlAccess = 'read' | 'operate' | 'admin';
type EmergencyPauseBody = {
  scope?: 'tenant' | 'agent' | null;
  agent_definition_id?: string | null;
  reason?: string;
  expires_in_minutes?: number | null;
};

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
    access: AgentControlAccess = 'read',
  ): Promise<T> {
    return this.tenantExecutor.run(
      context.tenantId,
      async (manager) => {
        await this.assertAccess(context, manager, access);
        return fn({ ...context, manager });
      },
      { transaction: false },
    );
  }

  private async runTransaction<T>(
    context: AiExecutionContext,
    access: AgentControlAccess,
    fn: (context: AiExecutionContextWithManager) => Promise<T>,
  ): Promise<T> {
    return this.tenantExecutor.run(
      context.tenantId,
      async (manager) => {
        await this.assertAccess(context, manager, access);
        return fn({ ...context, manager });
      },
    );
  }

  private async assertAccess(
    context: AiExecutionContext,
    manager: AiExecutionContextWithManager['manager'],
    access: AgentControlAccess,
  ): Promise<void> {
    if (access === 'admin') {
      await this.policy.assertAgentAdmin(context, manager);
      return;
    }
    if (access === 'operate') {
      await this.policy.assertAgentOperate(context, manager);
      return;
    }
    await this.policy.assertAgentRead(context, manager);
  }

  @Get('agents')
  async listAgents(@Req() req: any) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.listAgentDefinitions(tenantContext));
  }

  @Post('agents')
  async createAgent(
    @Req() req: any,
    @Body() body: AgentControlAgentDefinitionInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'admin', (tenantContext) => this.control.createAgentDefinition(tenantContext, body ?? {}));
  }

  @Get('agents/:id/autonomy')
  async getAgentAutonomy(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.getAgentAutonomy(tenantContext, id));
  }

  @Post('agents/:id/autonomy')
  async setAgentAutonomy(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AgentControlAutonomyInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'admin', (tenantContext) => this.control.setAgentAutonomy(tenantContext, id, body ?? {}));
  }

  @Get('agents/:id')
  async getAgent(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.getAgentDefinition(tenantContext, id));
  }

  @Post('agents/:id/targeting-preview')
  async previewAgentTargeting(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AgentControlTargetingPreviewInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'admin', (tenantContext) => this.control.previewAgentTargeting(tenantContext, id, body ?? {}));
  }

  @Get('agents/:id/targeting-options/:field')
  async getAgentTargetingOptions(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('field') field: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) =>
      this.control.getAgentTargetingOptions(tenantContext, id, field, { query, limit }),
    );
  }

  @Post('agents/:id')
  async updateAgent(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AgentControlAgentDefinitionInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'admin', (tenantContext) => this.control.updateAgentDefinition(tenantContext, id, body ?? {}));
  }

  @Post('agents/:id/status')
  async updateAgentStatus(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AgentControlAgentStatusInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'admin', (tenantContext) => this.control.updateAgentStatus(tenantContext, id, body ?? {}));
  }

  @Delete('agents/:id')
  async deleteAgentDefinition(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'admin', (tenantContext) => this.control.deleteAgentDefinition(tenantContext, id));
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

  @Get('badges')
  async getBadges(@Req() req: any) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.getBadges(tenantContext));
  }

  @Get('activity')
  async listActivity(
    @Req() req: any,
    @Query('agentDefinitionId') agentDefinitionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('targetRef') targetRef?: string,
    @Query('types') types?: string | string[],
    @Query('actorUserId') actorUserId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.listActivity(tenantContext, {
      agentDefinitionId: agentDefinitionId ?? null,
      from: from ?? null,
      to: to ?? null,
      targetRef: targetRef ?? null,
      types: parseActivityTypes(types),
      actorUserId: actorUserId ?? null,
      status: status ?? null,
      limit: parseLimit(limit, 50),
      offset: parseLimit(offset, 0),
    }));
  }

  @Get('helpdesk/evaluation/daily')
  async getHelpdeskEvaluationDaily(
    @Req() req: any,
    @Query('days') days?: string,
    @Query('agentDefinitionId') agentDefinitionId?: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.getHelpdeskEvaluationDaily(tenantContext, {
      days: parseLimit(days, 30),
      agentDefinitionId: agentDefinitionId ?? undefined,
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

  @Post('emergency-pause')
  async createEmergencyPause(
    @Req() req: any,
    @Body() body: EmergencyPauseBody = {},
  ) {
    const context = this.buildContext(req);
    return this.createEmergencyPauseForScope(context, body);
  }

  @Post('emergency-pause/:id/revoke')
  async revokeEmergencyPause(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.revokeEmergencyPauseByScope(context, id);
  }

  @Get('queue/work-items/:id/helpdesk-context')
  async getHelpdeskWorkItemContext(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, (tenantContext) => this.control.getHelpdeskWorkItemContext(tenantContext, id));
  }

  @Post('uat/mock-triage')
  async runMockTriage(
    @Req() req: any,
    @Body() body: AgentControlMockTriageInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'operate', (tenantContext) => this.control.runMockTriage(tenantContext, body ?? {}));
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
    return this.runTransaction(context, 'operate', (tenantContext) => this.control.runGlpiRead(tenantContext, body ?? {}));
  }

  @Post('uat/glpi-triage')
  async runGlpiTriage(
    @Req() req: any,
    @Body() body: AgentControlGlpiTriageInput = {},
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'operate', (tenantContext) => this.control.runGlpiTriage(tenantContext, body ?? {}));
  }

  @Post('helpdesk/glpi-ingestion/poll')
  async pollHelpdeskGlpiIngestion(
    @Req() req: any,
  ) {
    const context = this.buildContext(req);
    return this.runTransaction(context, 'operate', (tenantContext) => this.glpiIngestion.pollTenant(tenantContext));
  }

  @Get('helpdesk/glpi-ingestion/settings')
  async getHelpdeskGlpiIngestionSettings(
    @Req() req: any,
  ) {
    const context = this.buildContext(req);
    return this.runRead(context, async (tenantContext) => {
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
    return this.runTransaction(context, 'admin', async (tenantContext) => {
      const settings = await this.workQueue.updateHelpdeskGlpiIngestionSettings(tenantContext, body);
      const activePause = await this.emergencyPause.findActiveTenantWidePause(tenantContext);
      return { ...settings, emergency_pause: this.pauseView(activePause) };
    });
  }

  @Post('helpdesk/emergency-pause')
  async createHelpdeskEmergencyPause(
    @Req() req: any,
    @Body() body: EmergencyPauseBody = {},
  ) {
    const context = this.buildContext(req);
    return this.createEmergencyPauseForScope(context, { ...body, scope: 'tenant' });
  }

  private async createEmergencyPauseForScope(
    context: AiExecutionContext,
    body: EmergencyPauseBody,
  ) {
    const scope = body?.scope === 'agent' ? 'agent' : 'tenant';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      throw new ForbiddenException('An emergency pause requires an explicit reason.');
    }
    const expiresInMinutes = typeof body?.expires_in_minutes === 'number'
      && Number.isFinite(body.expires_in_minutes) && body.expires_in_minutes > 0
      ? Math.min(Math.floor(body.expires_in_minutes), 7 * 24 * 60)
      : null;
    const agentDefinitionId = scope === 'agent' ? (body?.agent_definition_id ?? null) : null;
    return this.runTransaction(context, scope === 'agent' ? 'operate' : 'admin', async (tenantContext) => {
      const pause = await this.emergencyPause.createPause(tenantContext, {
        scope,
        agentDefinitionId,
        reason,
        expiresAt: expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60_000) : null,
      });
      const label = scope === 'agent' ? 'Agent emergency pause' : 'Tenant emergency pause';
      await this.recordPauseAudit(
        tenantContext,
        'emergency_pause_created',
        `${label} activated: ${reason}`,
        pause.id,
        pause.agent_definition_id ?? null,
      );
      return this.pauseView(pause);
    });
  }

  @Post('helpdesk/emergency-pause/:id/revoke')
  async revokeHelpdeskEmergencyPause(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const context = this.buildContext(req);
    return this.revokeEmergencyPauseByScope(context, id);
  }

  private async revokeEmergencyPauseByScope(
    context: AiExecutionContext,
    id: string,
  ) {
    return this.runTransaction(context, 'operate', async (tenantContext) => {
      const existing = await this.emergencyPause.getPause(tenantContext, id);
      if (!existing) {
        throw new ForbiddenException('Emergency pause not found.');
      }
      if (existing.scope !== 'agent') {
        await this.policy.assertAgentAdmin(tenantContext, tenantContext.manager);
      }
      const pause = await this.emergencyPause.revokePause(tenantContext, id);
      const label = pause.scope === 'agent' ? 'Agent emergency pause' : 'Tenant emergency pause';
      await this.recordPauseAudit(
        tenantContext,
        'emergency_pause_revoked',
        `${label} lifted: ${pause.reason}`,
        pause.id,
        pause.agent_definition_id ?? null,
      );
      return this.pauseView(pause);
    });
  }

  private pauseView(pause: {
    id: string;
    active: boolean;
    reason: string;
    scope?: string | null;
    agent_definition_id?: string | null;
    created_at?: Date | null;
    expires_at?: Date | null;
  } | null) {
    if (!pause) {
      return null;
    }
    return {
      id: pause.id,
      active: pause.active,
      scope: pause.scope ?? null,
      agent_definition_id: pause.agent_definition_id ?? null,
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
    agentDefinitionId: string | null,
  ): Promise<void> {
    await this.workQueue.recordAuditEvent(tenantContext, {
      agentDefinitionId,
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
    return this.runTransaction(context, 'operate', (tenantContext) => this.control.approveActionRequest(tenantContext, id, {
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
    return this.runTransaction(context, 'operate', (tenantContext) => this.control.rejectActionRequest(
      tenantContext,
      id,
      body?.reason ?? null,
    ));
  }
}
