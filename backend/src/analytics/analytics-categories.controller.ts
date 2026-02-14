import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { AnalyticsCategoriesService } from './analytics-categories.service';

@UseGuards(JwtAuthGuard)
@Controller('analytics-categories')
export class AnalyticsCategoriesController {
  constructor(private readonly svc: AnalyticsCategoriesService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('analytics', 'reader')
  @Get()
  list(@Query() query: any, @Req() req: any) {
    return this.svc.list(query, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('analytics', 'reader')
  @Get('ids')
  listIds(@Query() query: any, @Req() req: any) {
    return this.svc.listIds(query, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('analytics', 'reader')
  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.get(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('analytics', 'member')
  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.svc.create(body, req?.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('analytics', 'member')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.update(id, body, req?.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }
}
