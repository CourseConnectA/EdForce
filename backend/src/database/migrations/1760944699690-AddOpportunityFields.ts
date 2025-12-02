import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOpportunityFields1760944699690 implements MigrationInterface {
    name = 'AddOpportunityFields1760944699690'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "base_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date_entered" TIMESTAMP NOT NULL DEFAULT now(), "date_modified" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, "modified_by" uuid, "deleted" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_03e6c58047b7a4b3f6de0bfa8d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "opportunities" ADD "contact_id" uuid`);
        await queryRunner.query(`ALTER TABLE "opportunities" ADD "date_closed_expected" date`);
        await queryRunner.query(`ALTER TABLE "opportunities" ADD CONSTRAINT "FK_4b83e10e8719b1cbb59c7cdabdd" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "opportunities" DROP CONSTRAINT "FK_4b83e10e8719b1cbb59c7cdabdd"`);
        await queryRunner.query(`ALTER TABLE "opportunities" DROP COLUMN "date_closed_expected"`);
        await queryRunner.query(`ALTER TABLE "opportunities" DROP COLUMN "contact_id"`);
        await queryRunner.query(`DROP TABLE "base_entity"`);
    }

}
