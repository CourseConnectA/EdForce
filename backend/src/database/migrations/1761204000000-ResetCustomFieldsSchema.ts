import { MigrationInterface, QueryRunner } from "typeorm";

export class ResetCustomFieldsSchema1761204000000 implements MigrationInterface {
    name = 'ResetCustomFieldsSchema1761204000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing tables if they exist to avoid NOT NULL add-column failures
        await queryRunner.query(`DROP TABLE IF EXISTS "custom_field_values" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "custom_field_definitions" CASCADE`);

        // Recreate custom_field_definitions with the new schema
        await queryRunner.query(`
            CREATE TABLE "custom_field_definitions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "entity_type" character varying(32) NOT NULL,
                "name" character varying(128) NOT NULL,
                "key" character varying(128) NOT NULL,
                "field_type" character varying(32) NOT NULL,
                "options" jsonb,
                "required" boolean NOT NULL DEFAULT false,
                "order" integer NOT NULL DEFAULT 0,
                "help_text" character varying(255),
                "default_value" jsonb,
                "active" boolean NOT NULL DEFAULT true,
                "date_entered" TIMESTAMP NOT NULL DEFAULT now(),
                "date_modified" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c5a8f8e60a1cf2d8a1c3b1a3d02" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_custom_field_def_entity_key" ON "custom_field_definitions" ("entity_type", "key")`);

        // Recreate custom_field_values with the new schema
        await queryRunner.query(`
            CREATE TABLE "custom_field_values" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "entity_type" character varying(32) NOT NULL,
                "record_id" uuid NOT NULL,
                "field_id" uuid,
                "value" jsonb,
                "date_entered" TIMESTAMP NOT NULL DEFAULT now(),
                "date_modified" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c74f2e3f5a28d88b69f6a0b0f63" PRIMARY KEY ("id"),
                CONSTRAINT "FK_custom_field_values_field" FOREIGN KEY ("field_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_custom_field_values_unique" ON "custom_field_values" ("entity_type", "record_id", "field_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_field_values_unique"`);
        await queryRunner.query(`ALTER TABLE "custom_field_values" DROP CONSTRAINT IF EXISTS "FK_custom_field_values_field"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "custom_field_values"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_field_def_entity_key"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "custom_field_definitions"`);
    }
}
