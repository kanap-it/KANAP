import { SetMetadata } from '@nestjs/common';

export const REQUIRE_LEVEL_KEY = 'require_level';
export const REQUIRE_ANY_LEVEL_KEY = 'require_any_level';
export type PermissionLevel = 'reader' | 'contributor' | 'member' | 'admin';
export type RequireLevelMeta = { resource: string; level: PermissionLevel };
export type RequireAnyLevelMeta = RequireLevelMeta[];

export const RequireLevel = (resource: string, level: PermissionLevel) =>
  SetMetadata(REQUIRE_LEVEL_KEY, { resource, level } as RequireLevelMeta);

export const RequireAnyLevel = (requirements: RequireAnyLevelMeta) =>
  SetMetadata(REQUIRE_ANY_LEVEL_KEY, requirements);
