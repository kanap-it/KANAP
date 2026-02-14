import { MigrationInterface, QueryRunner } from "typeorm";

export class ContractsTenantRealign1756688000000 implements MigrationInterface {
  name = 'ContractsTenantRealign1756688000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily relax RLS to realign tenant_id values consistently
    const tables = ['contracts','contract_tasks','contract_spend_items','contract_attachments','contract_links'];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Align contracts.tenant_id to the owning company's tenant_id (authoritative)
    await queryRunner.query(`
      UPDATE contracts c
      SET tenant_id = comp.tenant_id
      FROM companies comp
      WHERE c.company_id = comp.id AND c.tenant_id IS DISTINCT FROM comp.tenant_id;
    `);

    // Propagate contracts.tenant_id to child tables
    await queryRunner.query(`
      UPDATE contract_tasks t
      SET tenant_id = c.tenant_id
      FROM contracts c
      WHERE t.contract_id = c.id AND t.tenant_id IS DISTINCT FROM c.tenant_id;
    `);
    await queryRunner.query(`
      UPDATE contract_spend_items l
      SET tenant_id = c.tenant_id
      FROM contracts c
      WHERE l.contract_id = c.id AND l.tenant_id IS DISTINCT FROM c.tenant_id;
    `);
    await queryRunner.query(`
      UPDATE contract_attachments a
      SET tenant_id = c.tenant_id
      FROM contracts c
      WHERE a.contract_id = c.id AND a.tenant_id IS DISTINCT FROM c.tenant_id;
    `);
    await queryRunner.query(`
      UPDATE contract_links u
      SET tenant_id = c.tenant_id
      FROM contracts c
      WHERE u.contract_id = c.id AND u.tenant_id IS DISTINCT FROM c.tenant_id;
    `);

    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op: leaving data aligned is safe; RLS remains enabled
  }
}

