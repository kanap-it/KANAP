import { MigrationInterface, QueryRunner } from 'typeorm';

export class RichTextSupport1801000000000 implements MigrationInterface {
  name = 'RichTextSupport1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add source_field column to portfolio_request_attachments
    // NULL = explicit file upload, non-null = inline image from rich text field
    await queryRunner.query(`
      ALTER TABLE portfolio_request_attachments
      ADD COLUMN IF NOT EXISTS source_field text NULL
    `);

    // Add source_field column to portfolio_project_attachments
    await queryRunner.query(`
      ALTER TABLE portfolio_project_attachments
      ADD COLUMN IF NOT EXISTS source_field text NULL
    `);

    // Add source_field column to task_attachments
    await queryRunner.query(`
      ALTER TABLE task_attachments
      ADD COLUMN IF NOT EXISTS source_field text NULL
    `);

    // Convert existing plain text to HTML for portfolio_requests
    // Wrap content in paragraphs, convert newlines to paragraph breaks
    await queryRunner.query(`
      UPDATE portfolio_requests
      SET purpose = '<p>' || REPLACE(REPLACE(purpose, E'\r\n', E'\n'), E'\n', '</p><p>') || '</p>'
      WHERE purpose IS NOT NULL
        AND purpose != ''
        AND purpose NOT LIKE '<%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_requests
      SET current_situation = '<p>' || REPLACE(REPLACE(current_situation, E'\r\n', E'\n'), E'\n', '</p><p>') || '</p>'
      WHERE current_situation IS NOT NULL
        AND current_situation != ''
        AND current_situation NOT LIKE '<%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_requests
      SET expected_benefits = '<p>' || REPLACE(REPLACE(expected_benefits, E'\r\n', E'\n'), E'\n', '</p><p>') || '</p>'
      WHERE expected_benefits IS NOT NULL
        AND expected_benefits != ''
        AND expected_benefits NOT LIKE '<%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_requests
      SET risks = '<p>' || REPLACE(REPLACE(risks, E'\r\n', E'\n'), E'\n', '</p><p>') || '</p>'
      WHERE risks IS NOT NULL
        AND risks != ''
        AND risks NOT LIKE '<%'
    `);

    // Convert existing plain text to HTML for portfolio_projects
    await queryRunner.query(`
      UPDATE portfolio_projects
      SET purpose = '<p>' || REPLACE(REPLACE(purpose, E'\r\n', E'\n'), E'\n', '</p><p>') || '</p>'
      WHERE purpose IS NOT NULL
        AND purpose != ''
        AND purpose NOT LIKE '<%'
    `);

    // Convert existing plain text to HTML for portfolio_activities
    await queryRunner.query(`
      UPDATE portfolio_activities
      SET content = '<p>' || REPLACE(REPLACE(content, E'\r\n', E'\n'), E'\n', '</p><p>') || '</p>'
      WHERE content IS NOT NULL
        AND content != ''
        AND content NOT LIKE '<%'
    `);

    // Clean up empty paragraphs that may have been created
    await queryRunner.query(`
      UPDATE portfolio_requests
      SET purpose = REPLACE(purpose, '<p></p>', '')
      WHERE purpose LIKE '%<p></p>%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_requests
      SET current_situation = REPLACE(current_situation, '<p></p>', '')
      WHERE current_situation LIKE '%<p></p>%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_requests
      SET expected_benefits = REPLACE(expected_benefits, '<p></p>', '')
      WHERE expected_benefits LIKE '%<p></p>%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_requests
      SET risks = REPLACE(risks, '<p></p>', '')
      WHERE risks LIKE '%<p></p>%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_projects
      SET purpose = REPLACE(purpose, '<p></p>', '')
      WHERE purpose LIKE '%<p></p>%'
    `);

    await queryRunner.query(`
      UPDATE portfolio_activities
      SET content = REPLACE(content, '<p></p>', '')
      WHERE content LIKE '%<p></p>%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove source_field columns
    await queryRunner.query(`
      ALTER TABLE portfolio_request_attachments
      DROP COLUMN IF EXISTS source_field
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_project_attachments
      DROP COLUMN IF EXISTS source_field
    `);

    await queryRunner.query(`
      ALTER TABLE task_attachments
      DROP COLUMN IF EXISTS source_field
    `);

    // Note: We don't convert HTML back to plain text as that would be lossy
  }
}
