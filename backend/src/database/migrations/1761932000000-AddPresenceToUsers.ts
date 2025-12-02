import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPresenceToUsers1761932000000 implements MigrationInterface {
  name = 'AddPresenceToUsers1761932000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "presence" varchar(20) NOT NULL DEFAULT 'offline'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "presence"`);
  }
}
