import { MigrationInterface, QueryRunner } from "typeorm";

export class MarketingAutomationTables1761927000000 implements MigrationInterface {
    name = 'MarketingAutomationTables1761927000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "automation_campaigns" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "date_entered" TIMESTAMP NOT NULL DEFAULT now(),
            "date_modified" TIMESTAMP NOT NULL DEFAULT now(),
            "created_by" uuid,
            "modified_by" uuid,
            "deleted" boolean NOT NULL DEFAULT false,
            "name" varchar(150) NOT NULL,
            "description" text,
            "status" varchar(30) NOT NULL DEFAULT 'draft',
            "owner_id" uuid
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "automation_steps" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "date_entered" TIMESTAMP NOT NULL DEFAULT now(),
            "date_modified" TIMESTAMP NOT NULL DEFAULT now(),
            "created_by" uuid,
            "modified_by" uuid,
            "deleted" boolean NOT NULL DEFAULT false,
            "campaign_id" uuid NOT NULL,
            "order" int NOT NULL,
            "type" varchar(30) NOT NULL,
            "config" jsonb NOT NULL
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "automation_batches" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "date_entered" TIMESTAMP NOT NULL DEFAULT now(),
            "date_modified" TIMESTAMP NOT NULL DEFAULT now(),
            "created_by" uuid,
            "modified_by" uuid,
            "deleted" boolean NOT NULL DEFAULT false,
            "name" varchar(150) NOT NULL,
            "campaign_id" uuid,
            "assigned_to_id" uuid,
            "status" varchar(30) NOT NULL DEFAULT 'draft'
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "automation_batch_items" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "date_entered" TIMESTAMP NOT NULL DEFAULT now(),
            "date_modified" TIMESTAMP NOT NULL DEFAULT now(),
            "created_by" uuid,
            "modified_by" uuid,
            "deleted" boolean NOT NULL DEFAULT false,
            "batch_id" uuid NOT NULL,
            "lead_id" uuid,
            "payload" jsonb NOT NULL,
            "status" varchar(30) NOT NULL DEFAULT 'pending',
            "assignee_id" uuid
        )`);

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "automation_events" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "date_entered" TIMESTAMP NOT NULL DEFAULT now(),
            "date_modified" TIMESTAMP NOT NULL DEFAULT now(),
            "created_by" uuid,
            "modified_by" uuid,
            "deleted" boolean NOT NULL DEFAULT false,
            "campaign_id" uuid,
            "batch_id" uuid,
            "batch_item_id" uuid,
            "lead_id" uuid,
            "channel" varchar(20) NOT NULL,
            "event" varchar(30) NOT NULL,
            "meta" jsonb,
            "score_delta" int NOT NULL DEFAULT 0
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_batch_items"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_batches"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_steps"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_campaigns"`);
    }
}
