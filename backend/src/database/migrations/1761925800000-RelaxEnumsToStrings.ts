import { MigrationInterface, QueryRunner } from "typeorm";

export class RelaxEnumsToStrings1761925800000 implements MigrationInterface {
    name = 'RelaxEnumsToStrings1761925800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Leads.status: enum -> varchar (drop default first to avoid dependency)
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "status" TYPE varchar(50) USING "status"::text`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'New'`);

        // Opportunities.sales_stage: enum -> varchar (drop default first to avoid dependency)
        await queryRunner.query(`ALTER TABLE "opportunities" ALTER COLUMN "sales_stage" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "opportunities" ALTER COLUMN "sales_stage" TYPE varchar(100) USING "sales_stage"::text`);
        await queryRunner.query(`ALTER TABLE "opportunities" ALTER COLUMN "sales_stage" SET DEFAULT 'Prospecting'`);

        // Best-effort drop generated enum types if they exist (Postgres)
        await queryRunner.query(`DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_status_enum') THEN
                DROP TYPE leads_status_enum;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunities_sales_stage_enum') THEN
                DROP TYPE opportunities_sales_stage_enum;
            END IF;
        END $$;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate enum types with the original fixed set (may fail if data contains other values)
        await queryRunner.query(`DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leads_status_enum') THEN
                CREATE TYPE leads_status_enum AS ENUM ('New','Assigned','In Process','Converted','Recycled','Dead');
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'opportunities_sales_stage_enum') THEN
                CREATE TYPE opportunities_sales_stage_enum AS ENUM ('Prospecting','Qualification','Needs Analysis','Value Proposition','Id. Decision Makers','Perception Analysis','Proposal/Price Quote','Negotiation/Review','Closed Won','Closed Lost');
            END IF;
        END $$;`);

        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "status" TYPE leads_status_enum USING "status"::leads_status_enum`);
        await queryRunner.query(`ALTER TABLE "opportunities" ALTER COLUMN "sales_stage" TYPE opportunities_sales_stage_enum USING "sales_stage"::opportunities_sales_stage_enum`);
    }
}
