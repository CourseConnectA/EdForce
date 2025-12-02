import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImportantAndViewScope1762202000000 implements MigrationInterface {
  name = 'AddImportantAndViewScope1762202000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_important to leads
    await queryRunner.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_important boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_leads_is_important ON leads(is_important)`);

    // Add scope and center_name to lead_views
    await queryRunner.query(`ALTER TABLE lead_views ADD COLUMN IF NOT EXISTS scope varchar(16) NOT NULL DEFAULT 'personal'`);
    await queryRunner.query(`ALTER TABLE lead_views ADD COLUMN IF NOT EXISTS center_name varchar(150)`);

    // Unique index for center-shared views by (center_name, name) where scope='center'
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_views_center_name ON lead_views(center_name, name) WHERE scope = 'center'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_lead_views_center_name`);
    // Cannot drop default easily; safe to keep columns but set nullable if needed
    await queryRunner.query(`ALTER TABLE lead_views DROP COLUMN IF EXISTS center_name`);
    await queryRunner.query(`ALTER TABLE lead_views DROP COLUMN IF EXISTS scope`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_leads_is_important`);
    await queryRunner.query(`ALTER TABLE leads DROP COLUMN IF EXISTS is_important`);
  }
}
