import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveContactOpportunityCustomFields1761928000000 implements MigrationInterface {
    name = 'RemoveContactOpportunityCustomFields1761928000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Delete values first due to FK
        await queryRunner.query(`DELETE FROM custom_field_values WHERE entity_type IN ('contact','opportunity')`);
        await queryRunner.query(`DELETE FROM custom_field_definitions WHERE entity_type IN ('contact','opportunity')`);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // Non-reversible without prior snapshot of deleted rows
        return;
    }
}
