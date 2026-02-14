import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { PortfolioSettingsService } from './portfolio-settings.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/settings')
export class PortfolioSettingsController {
  constructor(private readonly svc: PortfolioSettingsService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get()
  get(@Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.get(tenantId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'admin')
  @Patch()
  update(@Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.update(tenantId, body, {
      manager: req?.queryRunner?.manager,
    });
  }
}
