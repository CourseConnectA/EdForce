import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReportsTables1762501000000 implements MigrationInterface {
  name = 'CreateReportsTables1762501000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS report_folders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(150) NOT NULL,
        description text NULL,
        center_name varchar(150) NULL,
        date_entered TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_report_folders_center ON report_folders(center_name);`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(180) NOT NULL,
        description text NULL,
        folder_id uuid NULL,
        report_type varchar(64) NOT NULL,
        config jsonb NULL,
        scope varchar(16) NOT NULL DEFAULT 'personal',
        center_name varchar(150) NULL,
        created_by uuid NOT NULL,
        starred_by jsonb NULL,
        date_entered TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reports_center_scope ON reports(center_name, scope);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_created_by;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_center_scope;`);
    await queryRunner.query(`DROP TABLE IF EXISTS reports;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_report_folders_center;`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_folders;`);
  }
}
