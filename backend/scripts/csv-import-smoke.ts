import 'dotenv/config';
import { DataSource } from 'typeorm';
import type { Express } from 'express';
import { Account } from '../src/accounts/account.entity';
import { AccountsService } from '../src/accounts/accounts.service';
import { AuditLog } from '../src/audit/audit.entity';
import { AuditService } from '../src/audit/audit.service';
import { Company } from '../src/companies/company.entity';
import { CompaniesService } from '../src/companies/companies.service';
import { Department } from '../src/departments/department.entity';
import { DepartmentsService } from '../src/departments/departments.service';
import { Supplier } from '../src/suppliers/supplier.entity';
import { SuppliersService } from '../src/suppliers/suppliers.service';
import { User } from '../src/users/user.entity';
import { UsersService } from '../src/users/users.service';
import { Role } from '../src/roles/role.entity';
import { RolesService } from '../src/roles/roles.service';
import { RolePermission } from '../src/permissions/role-permission.entity';
import { Subscription } from '../src/billing/subscription.entity';
import { BillingService } from '../src/billing/billing.service';

type ImportResult = { ok: boolean; errors?: Array<{ row: number; message: string }>; processed?: number };

function makeCsvFile(content: string) {
  return {
    originalname: 'import.csv',
    mimetype: 'text/csv',
    size: Buffer.byteLength(content, 'utf8'),
    buffer: Buffer.from(content, 'utf8'),
  } as unknown as Express.Multer.File;
}

function assertOk(name: string, res: ImportResult) {
  if (!res?.ok) {
    const details = res?.errors?.map((e) => `row ${e.row}: ${e.message}`).join('; ') ?? 'unknown error';
    throw new Error(`${name} import failed: ${details}`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url,
    ssl: false,
    entities: [
      Account,
      AuditLog,
      Company,
      Department,
      Supplier,
      User,
      Role,
      RolePermission,
      Subscription,
    ],
  });

  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();

  const tag = `csv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  try {
    const tenantInsert = await runner.query(
      `INSERT INTO tenants(slug, name) VALUES ($1, $2) RETURNING id`,
      [`${tag}`, `CSV Smoke ${tag}`],
    );
    const tenantId = tenantInsert?.[0]?.id as string;
    if (!tenantId) throw new Error('Failed to insert tenant');
    await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);

    const manager = runner.manager;

    const auditService = new AuditService(dataSource.getRepository(AuditLog));
    const rolesService = new RolesService(
      dataSource.getRepository(Role),
      dataSource.getRepository(RolePermission),
    );
    const billingService = new BillingService(
      dataSource.getRepository(Subscription),
      dataSource.getRepository(User),
    );
    const companiesService = new CompaniesService(dataSource.getRepository(Company), auditService);
    const departmentsService = new DepartmentsService(
      dataSource.getRepository(Department),
      dataSource.getRepository(Company),
      auditService,
    );
    const suppliersService = new SuppliersService(dataSource.getRepository(Supplier), auditService);
    const accountsService = new AccountsService(dataSource.getRepository(Account), auditService);
    const usersService = new UsersService(
      dataSource.getRepository(User),
      dataSource.getRepository(Company),
      dataSource.getRepository(Department),
      rolesService,
      billingService,
      auditService,
    );

    // Company import
    const companyName = `SmokeCo_${tag}`;
    const companyCsv = [
      'name;country_iso;city;postal_code;address;reg_number;vat_number;base_currency;status',
      `${companyName};US;New York;10001;123 Smoke St;;;USD;enabled`,
    ].join('\n');
    const companyRes = await companiesService.importCsv(
      { file: makeCsvFile(companyCsv), dryRun: false, userId: null },
      { manager },
    );
    assertOk('companies', companyRes as ImportResult);
    const company = await manager.getRepository(Company).findOne({ where: { name: companyName } });
    if (!company) throw new Error('Imported company not found');

    // Accounts import
    const accountNumber = (1000 + Math.floor(Math.random() * 800)).toString();
    const accountCsv = [
      'account_number;account_name;description;consolidation_account_number;consolidation_account_name;consolidation_account_description;status',
      [accountNumber, `Operations ${tag}`, 'Operating cash', '', '', '', 'enabled'].join(';'),
    ].join('\n');
    const accountRes = await accountsService.importCsv(
      { file: makeCsvFile(accountCsv), dryRun: false, userId: null },
      { manager },
    );
    assertOk('accounts', accountRes as ImportResult);
    const account = await manager
      .getRepository(Account)
      .findOne({ where: { account_number: accountNumber } });
    if (!account || account.tenant_id !== tenantId) throw new Error('Account import verification failed');

    // Suppliers import
    const supplierName = `Supplier_${tag}`;
    const supplierCsv = [
      'name;erp_supplier_id;commercial_contact;technical_contact;support_contact;notes;status',
      [supplierName, '', '', '', '', '', 'enabled'].join(';'),
    ].join('\n');
    const supplierRes = await suppliersService.importCsv(
      { file: makeCsvFile(supplierCsv), dryRun: false, userId: null },
      { manager },
    );
    assertOk('suppliers', supplierRes as ImportResult);
    const supplier = await manager.getRepository(Supplier).findOne({ where: { name: supplierName } });
    if (!supplier || supplier.tenant_id !== tenantId) throw new Error('Supplier import verification failed');

    // Departments import
    const departmentName = `IT_${tag}`;
    const departmentCsv = [
      'company_name;name;description;status',
      [companyName, departmentName, 'IT Department', 'enabled'].join(';'),
    ].join('\n');
    const departmentRes = await departmentsService.importCsv(
      { file: makeCsvFile(departmentCsv), dryRun: false, userId: null },
      { manager },
    );
    assertOk('departments', departmentRes as ImportResult);
    const department = await manager
      .getRepository(Department)
      .findOne({ where: { name: departmentName } });
    if (!department || department.tenant_id !== tenantId) throw new Error('Department import verification failed');

    // Users import
    const userEmail = `import_${tag}@example.com`;
    const userCsv = [
      'email;first_name;last_name;role;company_name;department_name;status',
      [userEmail, 'Casey', 'Tenant', 'Analyst', companyName, departmentName, 'enabled'].join(';'),
    ].join('\n');
    const userRes = await usersService.importCsv(
      { file: makeCsvFile(userCsv), dryRun: false, userId: null },
      { manager },
    );
    assertOk('users', userRes as ImportResult);
    const user = await manager.getRepository(User).findOne({ where: { email: userEmail } });
    if (!user || user.tenant_id !== tenantId) throw new Error('User import verification failed');

    console.log('CSV import smoke test passed for accounts, suppliers, departments, and users.');
    await runner.rollbackTransaction();
  } catch (err) {
    try {
      await runner.rollbackTransaction();
    } catch {}
    await runner.release();
    await dataSource.destroy();
    console.error('CSV import smoke test failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  await runner.release();
  await dataSource.destroy();
}

main();
