import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { REQUIRE_LEVEL_KEY, RequireLevelMeta } from '../../auth/require-level.decorator';
import { UsersController } from '../users.controller';

function run() {
  const meta = Reflect.getMetadata(REQUIRE_LEVEL_KEY, UsersController.prototype.create) as RequireLevelMeta;
  assert.deepEqual(meta, { resource: 'users', level: 'admin' });
}

run();
