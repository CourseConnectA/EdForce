import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCenterFieldOptions1762402000000 implements MigrationInterface {
  name = 'CreateCenterFieldOptions1762402000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS center_field_options (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        center_name varchar(150) NOT NULL,
        field_key varchar(128) NOT NULL,
        options jsonb NOT NULL DEFAULT '[]'::jsonb,
        date_entered TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_center_field_options ON center_field_options(center_name, field_key);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_center_field_center_name ON center_field_options(center_name);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_center_field_key ON center_field_options(field_key);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_center_field_key;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_center_field_center_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_center_field_options;`);
    await queryRunner.query(`DROP TABLE IF EXISTS center_field_options;`);
  }
}
