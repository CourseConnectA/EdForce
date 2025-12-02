import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDataJsonToLeads1762000000000 implements MigrationInterface {
    name = 'AddDataJsonToLeads1762000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "data" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "data"`);
    }
}
