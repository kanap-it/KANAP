import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { PortfolioPhaseTemplatesService } from './portfolio-phase-templates.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/phase-templates')
export class PortfolioPhaseTemplatesController {
  constructor(private readonly svc: PortfolioPhaseTemplatesService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get()
  list(@Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.list(tenantId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.get(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'admin')
  @Post()
  create(@Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.create(body, tenantId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.update(id, body, tenantId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'admin')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.svc.delete(id, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }
}
