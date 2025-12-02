import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCenterScopeToCustomFields1761825600000 implements MigrationInterface {
    name = 'AddCenterScopeToCustomFields1761825600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add center_name column
        await queryRunner.query(`ALTER TABLE "custom_field_definitions" ADD COLUMN IF NOT EXISTS "center_name" varchar(150)`);
        // Drop old unique index if exists
        try { await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_field_definitions_entityType_key"`); } catch {}
        // Create new composite unique index (entity_type, center_name, key)
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cfd_entity_center_key" ON "custom_field_definitions" ("entity_type", "center_name", "key")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop new index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_cfd_entity_center_key"`);
        // Recreate old unique index (entity_type, key)
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_custom_field_definitions_entityType_key" ON "custom_field_definitions" ("entity_type", "key")`);
        // Remove column
        await queryRunner.query(`ALTER TABLE "custom_field_definitions" DROP COLUMN IF EXISTS "center_name"`);
    }
}
