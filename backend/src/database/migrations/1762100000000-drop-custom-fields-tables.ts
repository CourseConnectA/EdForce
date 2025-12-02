import { MigrationInterface, QueryRunner } from "typeorm";

export class DropCustomFieldsTables1762100000000 implements MigrationInterface {
    name = 'DropCustomFieldsTables1762100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop values first due to FK to definitions
        await queryRunner.query(`DROP TABLE IF EXISTS custom_field_values CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS custom_field_definitions CASCADE;`);
        // Drop helper view if still exists
        await queryRunner.query(`DROP VIEW IF EXISTS leads_dynamic;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Minimal recreate to allow down migrations; you may want to restore full schema if needed
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS custom_field_definitions (
            id uuid PRIMARY KEY,
            entity_type varchar(32) NOT NULL,
            name varchar(128) NOT NULL,
            key varchar(128) NOT NULL,
            field_type varchar(32) NOT NULL,
            options jsonb NULL,
            required boolean NOT NULL DEFAULT false,
            "order" int NOT NULL DEFAULT 0,
            group_name varchar(128) NULL,
            is_system boolean NOT NULL DEFAULT false,
            target_field varchar(128) NULL,
            help_text varchar(255) NULL,
            default_value jsonb NULL,
            active boolean NOT NULL DEFAULT true,
            center_name varchar(150) NULL,
            date_entered TIMESTAMP NOT NULL DEFAULT now(),
            date_modified TIMESTAMP NOT NULL DEFAULT now()
        );`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS UQ_custom_defs_entity_center_key ON custom_field_definitions(entity_type, center_name, key);`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS custom_field_values (
            id uuid PRIMARY KEY,
            entity_type varchar(32) NOT NULL,
            record_id uuid NOT NULL,
            field_id uuid REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
            value jsonb NULL,
            date_entered TIMESTAMP NOT NULL DEFAULT now(),
            date_modified TIMESTAMP NOT NULL DEFAULT now()
        );`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS UQ_custom_vals_entity_record_field ON custom_field_values(entity_type, record_id, field_id);`);
    }
}
