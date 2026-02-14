import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req } from '@nestjs/common';
import { RolesService } from './roles.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Role } from './role.entity';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { PermissionsService, RESOURCES } from '../permissions/permissions.service';
import { RolePermission } from '../permissions/role-permission.entity';
import { User } from '../users/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly perms: PermissionsService,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'reader')
  async getRoles(@Req() req: any) {
    const mg: EntityManager | undefined = req?.queryRunner?.manager;
    const items = await this.rolesService.list({ manager: mg });
    // Attach user counts
    const withCounts = await Promise.all(items.map(async (r) => {
      const count = await (mg ?? this.userRepo.manager).getRepository(User).count({ where: { role_id: r.id } });
      return { ...r, user_count: count } as any;
    }));
    return { items: withCounts };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async createRole(@Body() body: { role_name?: string; role_description?: string }, @Req() req: any) {
    const mg: EntityManager | undefined = req?.queryRunner?.manager;
    if (!body?.role_name) throw new BadRequestException('role_name is required');
    const saved = await this.rolesService.createRole({ role_name: body.role_name, role_description: body.role_description || null }, { manager: mg });
    return saved;
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async updateRole(@Param('id') id: string, @Body() body: { role_name?: string; role_description?: string | null }, @Req() req: any) {
    const mg: EntityManager | undefined = req?.queryRunner?.manager;
    const role = await (mg ?? this.roleRepo.manager).getRepository(Role).findOne({ where: { id } });
    if (!role) throw new BadRequestException('Role not found');
    if (role.is_system) throw new BadRequestException('Cannot modify a system role');
    if (role.is_built_in) throw new BadRequestException('Cannot modify a built-in role');
    try {
      const saved = await this.rolesService.updateRole(id, { role_name: body.role_name, role_description: body.role_description }, { manager: mg });
      if (!saved) throw new BadRequestException('Role not found');
      return saved;
    } catch (e: any) {
      if (String(e?.message || '').includes('unique')) throw new BadRequestException('Role name must be unique');
      throw new BadRequestException(e?.message || 'Failed to update role');
    }
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async deleteRole(@Param('id') id: string, @Req() req: any) {
    const mg: EntityManager | undefined = req?.queryRunner?.manager;
    const role = await (mg ?? this.roleRepo.manager).getRepository(Role).findOne({ where: { id } });
    if (!role) throw new BadRequestException('Role not found');
    if (role.is_system) throw new BadRequestException('Cannot delete system role');
    if (role.is_built_in) throw new BadRequestException('Cannot delete built-in role');
    const count = await (mg ?? this.userRepo.manager).getRepository(User).count({ where: { role_id: id } });
    if (count > 0) throw new BadRequestException('Cannot delete role with users assigned');
    await (mg ?? this.roleRepo.manager).getRepository(Role).delete({ id });
    return { ok: true };
  }

  @Post(':id/duplicate')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async duplicateRole(@Param('id') id: string, @Body() body: { role_name?: string }, @Req() req: any) {
    const mg: EntityManager | undefined = req?.queryRunner?.manager;
    const role = await (mg ?? this.roleRepo.manager).getRepository(Role).findOne({ where: { id } });
    if (!role) throw new BadRequestException('Role not found');
    if (role.is_system) throw new BadRequestException('Cannot duplicate system role');

    // Generate unique name
    let newName = body?.role_name?.trim() || `${role.role_name} (Copy)`;
    const existing = await this.rolesService.findByName(newName, { manager: mg });
    if (existing) {
      // Add suffix to make unique
      let suffix = 2;
      while (await this.rolesService.findByName(`${newName} ${suffix}`, { manager: mg })) {
        suffix++;
      }
      newName = `${newName} ${suffix}`;
    }

    // Create new role (not built-in, not system)
    const saved = await this.rolesService.createRole(
      { role_name: newName, role_description: role.role_description, is_system: false },
      { manager: mg }
    );

    // Copy permissions
    const perms = await this.perms.getRolePermissionsMap(id, { manager: mg });
    if (Object.keys(perms).length > 0) {
      await this.perms.setRolePermissionsMap(saved.id, perms as any, { manager: mg });
    }

    return saved;
  }

  @Get(':id/permissions')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'reader')
  async getRolePermissions(@Param('id') id: string, @Req() req: any) {
    const mg: EntityManager | undefined = req?.queryRunner?.manager;
    const role = await (mg ?? this.roleRepo.manager).getRepository(Role).findOne({ where: { id } });
    if (!role) throw new BadRequestException('Role not found');
    const map = await this.perms.getRolePermissionsMap(id, { manager: mg });
    // Ensure all resources present (default none)
    const out: Record<string, 'reader'|'member'|'admin'|null> = {} as any;
    for (const r of RESOURCES) out[r] = (map as any)[r] ?? null;
    return out;
  }

  @Put(':id/permissions')
  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  async setRolePermissions(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const mg: EntityManager | undefined = req?.queryRunner?.manager;
    const role = await (mg ?? this.roleRepo.manager).getRepository(Role).findOne({ where: { id } });
    if (!role) throw new BadRequestException('Role not found');
    const key = (role.role_name ?? '').toLowerCase();
    if (role.is_system || key === 'administrator' || key === 'contact') {
      throw new BadRequestException('System role permissions cannot be modified');
    }
    if (role.is_built_in) {
      throw new BadRequestException('Built-in role permissions cannot be modified');
    }
    if (!body || typeof body !== 'object' || !body.permissions) throw new BadRequestException('permissions required');
    const perms = body.permissions as Record<string, 'reader'|'member'|'admin'|null>;
    return this.perms.setRolePermissionsMap(id, perms as any, { manager: mg });
  }
}
