import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { AiPolicyService } from './ai-policy.service';
import { AiExecutionContext } from './ai.types';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiCapabilitiesController {
  constructor(
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
  ) {}

  private buildContext(req: any): AiExecutionContext {
    return {
      tenantId: String(req?.tenant?.id || ''),
      userId: String(req?.user?.sub || ''),
      isPlatformHost: req?.isPlatformHost === true,
      surface: 'chat',
      authMethod: 'jwt',
      requestId: req?.id ?? null,
      aiApiKeyId: null,
    };
  }

  @Get('capabilities')
  async getCapabilities(@Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(
      context.tenantId,
      (manager) => this.policy.getCapabilities(context, manager),
    );
  }
}
