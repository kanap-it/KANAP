import { SetMetadata } from '@nestjs/common';

export const REQUIRE_LEVEL_KEY = 'require_level';
export type PermissionLevel = 'reader' | 'contributor' | 'member' | 'admin';
export type RequireLevelMeta = { resource: string; level: PermissionLevel };

export const RequireLevel = (resource: string, level: PermissionLevel) =>
  SetMetadata(REQUIRE_LEVEL_KEY, { resource, level } as RequireLevelMeta);

