import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCustomFieldIndexNames1761934000000 implements MigrationInterface {
    name = 'FixCustomFieldIndexNames1761934000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ensure center_name exists for composite uniqueness
        await queryRunner.query(`ALTER TABLE "custom_field_definitions" ADD COLUMN IF NOT EXISTS "center_name" varchar(150)`);

        // Drop old unique indexes that enforced (entity_type, key) globally
        try { await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_field_def_entity_key"`); } catch {}
        try { await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_field_definitions_entityType_key"`); } catch {}

        // Create the correct composite unique index scoped by center
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cfd_entity_center_key" ON "custom_field_definitions" ("entity_type", "center_name", "key")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the composite index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cfd_entity_center_key"`);
        // Recreate the previous global unique index for backward compatibility
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_custom_field_def_entity_key" ON "custom_field_definitions" ("entity_type", "key")`);
    }
}
