import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCenterRoutingRules1762500000000 implements MigrationInterface {
  name = 'CreateCenterRoutingRules1762500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS center_routing_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        center_name varchar(150) NOT NULL,
        rule_type varchar(32) NOT NULL,
        config jsonb NULL,
        active_until TIMESTAMPTZ NULL,
        is_active boolean NOT NULL DEFAULT true,
        last_assigned_user_id uuid NULL,
        date_entered TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_modified TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_crr_center_active ON center_routing_rules(center_name, is_active);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_crr_center_active;`);
    await queryRunner.query(`DROP TABLE IF EXISTS center_routing_rules;`);
  }
}
