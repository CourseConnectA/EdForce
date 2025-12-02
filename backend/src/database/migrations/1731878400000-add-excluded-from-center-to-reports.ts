import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExcludedFromCenterToReports1731878400000 implements MigrationInterface {
    name = 'AddExcludedFromCenterToReports1731878400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reports" ADD COLUMN "excluded_from_center" text[] NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reports_center_scope" ON "reports" ("center_name", "scope")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reports_created_by" ON "reports" ("created_by")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "excluded_from_center"`);
    }
}
