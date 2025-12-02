import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLeadsCustomData1761400000000 implements MigrationInterface {
  name = 'DropLeadsCustomData1761400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop dynamic view if present
    await queryRunner.query(`DROP VIEW IF EXISTS public.leads_dynamic CASCADE`);

    // Drop custom_data column if it exists
    const table = await queryRunner.getTable('leads');
    const has = table?.findColumnByName('custom_data');
    if (has) {
      await queryRunner.query(`ALTER TABLE public.leads DROP COLUMN IF EXISTS custom_data`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore column only (view intentionally not recreated)
    const table = await queryRunner.getTable('leads');
    const has = table?.findColumnByName('custom_data');
    if (!has) {
      await queryRunner.query(`ALTER TABLE public.leads ADD COLUMN custom_data jsonb NOT NULL DEFAULT '{}'::jsonb`);
    }
  }
}
