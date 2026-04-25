import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { AppAssetAssignmentsService } from './app-asset-assignments.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class AppAssetAssignmentsController {
  constructor(private readonly svc: AppAssetAssignmentsService) {}

  private listForDeployment(instanceId: string, req: any) {
    return this.svc.list(instanceId, { manager: req?.queryRunner?.manager });
  }

  private createForDeployment(instanceId: string, body: any, req: any) {
    return this.svc.create(instanceId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  private updateForDeployment(instanceId: string, assignmentId: string, body: any, req: any) {
    return this.svc.update(instanceId, assignmentId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  private deleteForDeployment(instanceId: string, assignmentId: string, req: any) {
    return this.svc.delete(instanceId, assignmentId, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  // New asset-based endpoints
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('app-deployments/:instanceId/assets')
  listDeploymentAssets(@Param('instanceId') instanceId: string, @Req() req: any) {
    return this.listForDeployment(instanceId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('app-instances/:instanceId/assets')
  listInstanceAssetsCompatibility(@Param('instanceId') instanceId: string, @Req() req: any) {
    return this.listForDeployment(instanceId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post('app-deployments/:instanceId/assets')
  createDeploymentAsset(@Param('instanceId') instanceId: string, @Body() body: any, @Req() req: any) {
    return this.createForDeployment(instanceId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post('app-instances/:instanceId/assets')
  createInstanceAssetCompatibility(@Param('instanceId') instanceId: string, @Body() body: any, @Req() req: any) {
    return this.createForDeployment(instanceId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch('app-deployments/:instanceId/assets/:assignmentId')
  updateDeploymentAsset(
    @Param('instanceId') instanceId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.updateForDeployment(instanceId, assignmentId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch('app-instances/:instanceId/assets/:assignmentId')
  updateInstanceAssetCompatibility(
    @Param('instanceId') instanceId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.updateForDeployment(instanceId, assignmentId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete('app-deployments/:instanceId/assets/:assignmentId')
  deleteDeploymentAsset(@Param('instanceId') instanceId: string, @Param('assignmentId') assignmentId: string, @Req() req: any) {
    return this.deleteForDeployment(instanceId, assignmentId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete('app-instances/:instanceId/assets/:assignmentId')
  deleteInstanceAssetCompatibility(@Param('instanceId') instanceId: string, @Param('assignmentId') assignmentId: string, @Req() req: any) {
    return this.deleteForDeployment(instanceId, assignmentId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('assets/:assetId/assignments')
  listByAsset(@Param('assetId') assetId: string, @Req() req: any) {
    return this.svc.listByAsset(assetId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Post('app-asset-assignments/assets-by-apps')
  listAssetsByApps(@Body() body: { applicationIds: string[]; environments: string[] }, @Req() req: any) {
    const applicationIds = Array.isArray(body?.applicationIds) ? body.applicationIds : [];
    const environments = Array.isArray(body?.environments) ? body.environments : [];
    return this.svc.listAssetsByApps(applicationIds, environments, { manager: req?.queryRunner?.manager });
  }

  // Backwards compatibility endpoints (servers → assets)
  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('app-deployments/:instanceId/servers')
  listDeploymentServers(@Param('instanceId') instanceId: string, @Req() req: any) {
    return this.listForDeployment(instanceId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('app-instances/:instanceId/servers')
  listInstanceServersCompatibility(@Param('instanceId') instanceId: string, @Req() req: any) {
    return this.listForDeployment(instanceId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post('app-deployments/:instanceId/servers')
  createDeploymentServer(@Param('instanceId') instanceId: string, @Body() body: any, @Req() req: any) {
    return this.createForDeployment(instanceId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post('app-instances/:instanceId/servers')
  createInstanceServerCompatibility(@Param('instanceId') instanceId: string, @Body() body: any, @Req() req: any) {
    return this.createForDeployment(instanceId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch('app-deployments/:instanceId/servers/:assignmentId')
  updateDeploymentServer(
    @Param('instanceId') instanceId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.updateForDeployment(instanceId, assignmentId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch('app-instances/:instanceId/servers/:assignmentId')
  updateInstanceServerCompatibility(
    @Param('instanceId') instanceId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.updateForDeployment(instanceId, assignmentId, body, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete('app-deployments/:instanceId/servers/:assignmentId')
  deleteDeploymentServer(@Param('instanceId') instanceId: string, @Param('assignmentId') assignmentId: string, @Req() req: any) {
    return this.deleteForDeployment(instanceId, assignmentId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete('app-instances/:instanceId/servers/:assignmentId')
  deleteInstanceServerCompatibility(@Param('instanceId') instanceId: string, @Param('assignmentId') assignmentId: string, @Req() req: any) {
    return this.deleteForDeployment(instanceId, assignmentId, req);
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('servers/:serverId/assignments')
  listByServerLegacy(@Param('serverId') serverId: string, @Req() req: any) {
    return this.svc.listByAsset(serverId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Post('app-server-assignments/servers-by-apps')
  listServersByAppsLegacy(@Body() body: { applicationIds: string[]; environments: string[] }, @Req() req: any) {
    const applicationIds = Array.isArray(body?.applicationIds) ? body.applicationIds : [];
    const environments = Array.isArray(body?.environments) ? body.environments : [];
    return this.svc.listAssetsByApps(applicationIds, environments, { manager: req?.queryRunner?.manager });
  }
}
