import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiExternalMcpBridgeHardening1852100000000 implements MigrationInterface {
  name = 'AiExternalMcpBridgeHardening1852100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_external_mcp_servers
      DROP CONSTRAINT IF EXISTS chk_ai_external_mcp_servers_enabled_mock
    `);
    await queryRunner.query(`
      ALTER TABLE ai_external_mcp_servers
      ADD CONSTRAINT chk_ai_external_mcp_servers_enabled_mock
      CHECK (enabled = false OR transport_kind = 'mock')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_external_mcp_servers
      DROP CONSTRAINT IF EXISTS chk_ai_external_mcp_servers_enabled_mock
    `);
  }
}
