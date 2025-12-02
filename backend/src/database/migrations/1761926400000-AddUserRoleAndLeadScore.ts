import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRoleAndLeadScore1761926400000 implements MigrationInterface {
    name = 'AddUserRoleAndLeadScore1761926400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(50) DEFAULT 'agent'`);
        await queryRunner.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "score" integer NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "score"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    }
}
