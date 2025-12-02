import { MigrationInterface, QueryRunner } from "typeorm";

export class FixCustomFieldIndexes1762001100000 implements MigrationInterface {
    name = 'FixCustomFieldIndexes1762001100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Attempt to drop any legacy unique indexes on (entity_type, key)
        try { await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_field_def_entity_key"`); } catch {}
        try { await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_field_definitions_entityType_key"`); } catch {}
        // Ensure composite unique index exists on (entity_type, center_name, key)
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cfd_entity_center_key" ON "custom_field_definitions" ("entity_type", "center_name", "key")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate one of the legacy indexes for rollback compatibility
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_custom_field_def_entity_key" ON "custom_field_definitions" ("entity_type", "key")`);
        // Best-effort drop the composite index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cfd_entity_center_key"`);
    }
}
