import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeNameColumnsNullable1761207000000 implements MigrationInterface {
    name = 'MakeNameColumnsNullable1761207000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "first_name" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "last_name" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contacts" ALTER COLUMN "first_name" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contacts" ALTER COLUMN "last_name" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to NOT NULL constraints (may fail if nulls are present)
        await queryRunner.query(`ALTER TABLE "contacts" ALTER COLUMN "last_name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contacts" ALTER COLUMN "first_name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "last_name" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leads" ALTER COLUMN "first_name" SET NOT NULL`);
    }
}
