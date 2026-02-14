import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersDeleteService } from './users-delete.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { csvImportMulterOptions } from '../common/upload';
import { contentDisposition } from '../common/content-disposition';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { resolveAppBaseUrl } from '../common/url';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './user-role.entity';
import { Role } from '../roles/role.entity';
import { User } from './user.entity';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly svc: UsersService,
    private readonly deleteSvc: UsersDeleteService,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'reader')
  list(@Query() query: any, @Req() req: any) { return this.svc.list(query, { manager: req?.queryRunner?.manager }); }

  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  @Delete('bulk')
  bulkDelete(@Body() body: { ids: string[] }, @Req() req: any) {
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    return this.deleteSvc.bulkDelete(ids, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @Get('export')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'reader')
  async export(@Query('scope') scope: 'template' | 'data' = 'data', @Res() res: Response, @Req() req: any) {
    const { filename, content } = await this.svc.exportCsv(scope, { manager: req?.queryRunner?.manager });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', contentDisposition(filename));
    res.send(content);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'reader')
  async getById(@Param('id') id: string, @Req() req: any) {
    const user = await this.svc.findById(id, { manager: req?.queryRunner?.manager });
    if (!user) return null;
    return { ...user, password_hash: undefined };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'member')
  create(@Body() body: any, @Req() req: any) { return this.svc.createUser(body, { manager: req?.queryRunner?.manager }); }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'member')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.updateUser(id, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @Post('import')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  @UseInterceptors(FileInterceptor('file', csvImportMulterOptions))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRunRaw: string,
    @Req() req: any,
  ) {
    const dryRun = String(dryRunRaw ?? 'true').toLowerCase() !== 'false';
    return this.svc.importCsv({ file, dryRun, userId: req.user?.sub ?? null }, { manager: req?.queryRunner?.manager });
  }

  // Seat-controlled status endpoints (Admin only)
  @Post(':id/enable')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async enable(@Param('id') id: string, @Req() req: any) { return this.svc.enableUser(id, req.user?.sub ?? null, { manager: req?.queryRunner?.manager }); }

  @Post(':id/disable')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async disable(@Param('id') id: string, @Req() req: any) { return this.svc.disableUser(id, req.user?.sub ?? null, { manager: req?.queryRunner?.manager }); }

  @Post(':id/invite')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async invite(@Param('id') id: string, @Req() req: any) {
    const baseUrl = resolveAppBaseUrl(req);
    return this.svc.inviteUser(id, req.user?.sub ?? null, baseUrl, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.deleteSvc.deleteUser(id, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  // Per-user page permissions removed: permissions are now role-based

  // Multi-role management endpoints
  @Get(':id/roles')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'reader')
  async getUserRoles(@Param('id') id: string, @Req() req: any) {
    const manager = req?.queryRunner?.manager;
    const repo = manager ? manager.getRepository(UserRole) : this.userRoleRepo;
    const userRoles = await repo.find({
      where: { user_id: id },
      relations: ['role'],
      order: { is_primary: 'DESC', created_at: 'ASC' },
    });
    return {
      items: userRoles.map(ur => ({
        id: ur.role_id,
        name: ur.role?.role_name ?? null,
        is_primary: ur.is_primary,
      })),
    };
  }

  @Put(':id/roles')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async setUserRoles(
    @Param('id') id: string,
    @Body() body: { role_ids: string[] },
    @Req() req: any,
  ) {
    const manager = req?.queryRunner?.manager;
    const userRoleRepo = manager ? manager.getRepository(UserRole) : this.userRoleRepo;
    const roleRepo = manager ? manager.getRepository(Role) : this.roleRepo;
    const userRepo = manager ? manager.getRepository(User) : this.userRepo;

    // Validate input
    const roleIds = body?.role_ids;
    if (!Array.isArray(roleIds) || roleIds.length === 0) {
      throw new BadRequestException('At least one role must be assigned');
    }

    // Validate all roles exist
    const roles = await roleRepo.find({ where: roleIds.map(rid => ({ id: rid })) });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more roles not found');
    }

    // Get user
    const user = await userRepo.findOne({ where: { id } });
    if (!user) throw new BadRequestException('User not found');

    // Delete existing user roles
    await userRoleRepo.delete({ user_id: id });

    // Create new user roles (first role is considered primary for backwards compat)
    for (let i = 0; i < roleIds.length; i++) {
      await userRoleRepo.save(userRoleRepo.create({
        tenant_id: user.tenant_id,
        user_id: id,
        role_id: roleIds[i],
        is_primary: i === 0,
      }));
    }

    // Update user's role_id to the first role (for backwards compatibility)
    user.role_id = roleIds[0];
    await userRepo.save(user);

    return this.getUserRoles(id, req);
  }
}
