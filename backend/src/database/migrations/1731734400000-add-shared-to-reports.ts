import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSharedToReports1731734400000 implements MigrationInterface {
    name = 'AddSharedToReports1731734400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reports" ADD COLUMN "shared_to" text[]`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "shared_to"`);
    }
}
