import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksController } from '../../spend/tasks.controller';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TENANT_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const PROJECT_ID = '44444444-4444-4444-8444-444444444444';

function makeController(opts?: {
  manager?: { query: (sql: string, params?: unknown[]) => Promise<unknown[]> };
  permissions?: Map<string, any>;
}) {
  const manager = opts?.manager ?? {
    query: async () => [{ role_id: 'role-1', role_name: 'portfolio manager' }],
  };
  const moved: any[] = [];
  const visible: any[] = [];
  const controller = new TasksController(
    {
      assertVisible: async (...args: any[]) => { visible.push(args); },
    } as any,
    {} as any,
    {
      moveTask: async (...args: any[]) => {
        moved.push(args);
        return { id: TASK_ID };
      },
    } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { manager } as any,
    {
      listForRoles: async () => opts?.permissions ?? new Map([['portfolio_projects', 'contributor']]),
    } as any,
  );
  const req = {
    user: { sub: USER_ID },
    tenant: { id: TENANT_ID },
    queryRunner: { manager },
  };
  return { controller, req, moved, visible };
}

async function testAllowsMovingIntoProjectWithPortfolioContributorPermission() {
  const { controller, req, moved } = makeController();

  await controller.move(TASK_ID, {
    related_object_type: 'project',
    related_object_id: PROJECT_ID,
  }, req);

  assert.equal(moved.length, 1);
  assert.deepEqual(moved[0][0], { id: TASK_ID, next: { type: 'project', id: PROJECT_ID } });
}

async function testRejectsProjectMoveWithoutPortfolioContributorPermission() {
  const { controller, req, moved } = makeController({
    permissions: new Map([['tasks', 'member']]),
  });

  await assert.rejects(
    () => controller.move(TASK_ID, {
      related_object_type: 'project',
      related_object_id: PROJECT_ID,
    }, req),
    ForbiddenException,
  );
  assert.equal(moved.length, 0);
}

async function testRejectsProjectMoveOutsideBusinessContributorScope() {
  const manager = {
    query: async (sql: string) => {
      if (sql.includes('role_permissions rp')) {
        return [{ role_id: 'role-1', role_name: 'business contributor', level: 'contributor' }];
      }
      if (sql.includes('FROM portfolio_projects p')) {
        return [];
      }
      return [{ role_id: 'role-1', role_name: 'business contributor' }];
    },
  };
  const { controller, req, moved } = makeController({ manager });

  await assert.rejects(
    () => controller.move(TASK_ID, {
      related_object_type: 'project',
      related_object_id: PROJECT_ID,
    }, req),
    NotFoundException,
  );
  assert.equal(moved.length, 0);
}

async function testAllowsMovingToStandaloneWithoutProjectPermission() {
  const { controller, req, moved } = makeController({
    permissions: new Map([['tasks', 'member']]),
  });

  await controller.move(TASK_ID, {
    related_object_type: null,
    related_object_id: null,
  }, req);

  assert.equal(moved.length, 1);
  assert.deepEqual(moved[0][0], { id: TASK_ID, next: { type: null, id: null } });
}

async function run() {
  await testAllowsMovingIntoProjectWithPortfolioContributorPermission();
  await testRejectsProjectMoveWithoutPortfolioContributorPermission();
  await testRejectsProjectMoveOutsideBusinessContributorScope();
  await testAllowsMovingToStandaloneWithoutProjectPermission();
}

void run();
