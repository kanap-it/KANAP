import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectionProtocolPortOverride1852400000000 implements MigrationInterface {
  name = 'ConnectionProtocolPortOverride1852400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Connection-level per-protocol port override. NULL = use the protocol's
    // typical port (suggestion). Mirrors connection_legs.port_override, which
    // covers per-hop overrides at a protocol break.
    await queryRunner.query(
      `ALTER TABLE connection_protocols ADD COLUMN IF NOT EXISTS port_override text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE connection_protocols DROP COLUMN IF EXISTS port_override`,
    );
  }
}
