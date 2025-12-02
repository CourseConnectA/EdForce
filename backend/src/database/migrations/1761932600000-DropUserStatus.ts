import { MigrationInterface, QueryRunner } from "typeorm";

export class DropUserStatus1761932600000 implements MigrationInterface {
  name = 'DropUserStatus1761932600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // If enum type exists, drop default before dropping column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "status"`);
    // If you had an enum type in Postgres for status, drop it (ignore error if not exists)
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
    } catch {}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate column as varchar to avoid enum re-creation complexity
    await queryRunner.query(`ALTER TABLE "users" ADD "status" varchar(20) DEFAULT 'Active'`);
  }
}
