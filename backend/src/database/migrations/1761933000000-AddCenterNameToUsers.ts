import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCenterNameToUsers1761933000000 implements MigrationInterface {
  name = 'AddCenterNameToUsers1761933000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "center_name" varchar(150)`);
    // Backfill: if someone had role 'manager' previously, set center_name to 'Default Center'
    await queryRunner.query(`UPDATE "users" SET center_name = COALESCE(center_name, 'Default Center') WHERE role = 'manager' AND center_name IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "center_name"`);
  }
}
