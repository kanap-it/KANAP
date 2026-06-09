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
