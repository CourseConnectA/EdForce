import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomFieldGroupingAndSystem1761205000000 implements MigrationInterface {
    name = 'AddCustomFieldGroupingAndSystem1761205000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "custom_field_definitions"
            ADD COLUMN IF NOT EXISTS "group_name" character varying(128),
            ADD COLUMN IF NOT EXISTS "is_system" boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "target_field" character varying(128)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop columns if they exist (Postgres requires separate DROP COLUMN statements)
        await queryRunner.query(`
            ALTER TABLE "custom_field_definitions"
            DROP COLUMN IF EXISTS "target_field"
        `);
        await queryRunner.query(`
            ALTER TABLE "custom_field_definitions"
            DROP COLUMN IF EXISTS "is_system"
        `);
        await queryRunner.query(`
            ALTER TABLE "custom_field_definitions"
            DROP COLUMN IF EXISTS "group_name"
        `);
    }
}
