import * as assert from 'node:assert/strict';
import { UsersService } from '../users.service';

async function run() {
  const repo = {
    find: async () => [
      {
        email: 'safe@example.invalid',
        first_name: '=2+5',
        last_name: '@cmd',
        role: { role_name: '+Admin' },
        company: { name: '-Company' },
        department: { name: '\tDepartment' },
        status: 'enabled',
      },
    ],
  };

  const service = new UsersService(
    repo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  const result = await service.exportCsv('data');
  assert.match(result.content, /;'=2\+5;/);
  assert.match(result.content, /;'@cmd;/);
  assert.match(result.content, /;'\+Admin;/);
  assert.match(result.content, /;'-Company;/);
  assert.match(result.content, /;'\tDepartment;/);
}

void run();
