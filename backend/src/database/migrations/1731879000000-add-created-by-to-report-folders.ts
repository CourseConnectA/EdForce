import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByToReportFolders1731879000000 implements MigrationInterface {
  name = 'AddCreatedByToReportFolders1731879000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "report_folders" ADD COLUMN "created_by" uuid NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_folders_center" ON "report_folders" ("center_name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_report_folders_created_by" ON "report_folders" ("created_by")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "report_folders" DROP COLUMN "created_by"`);
  }
}
