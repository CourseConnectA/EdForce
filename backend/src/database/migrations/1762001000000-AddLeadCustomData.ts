import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLeadCustomData1762001000000 implements MigrationInterface {
    name = 'AddLeadCustomData1762001000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "custom_data" jsonb NOT NULL DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "custom_data"`);
    }
}
