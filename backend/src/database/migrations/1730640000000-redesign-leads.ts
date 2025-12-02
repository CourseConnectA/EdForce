import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RedesignLeads1730640000000 implements MigrationInterface {
  name = 'RedesignLeads1730640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns if they don't already exist
    const table = await queryRunner.getTable('leads');
    const has = (n: string) => table?.findColumnByName(n);

    const add = async (col: TableColumn) => {
      if (!(await has(col.name))) {
        await queryRunner.addColumn('leads', col);
      }
    };

  // Add reference_no as nullable without default/unique first to avoid duplicate default collisions
  await add(new TableColumn({ name: 'reference_no', type: 'varchar', length: '16', isNullable: true }));
    await add(new TableColumn({ name: 'email', type: 'varchar', length: '150', isNullable: false, default: "''" }));
    await add(new TableColumn({ name: 'email_verified', type: 'boolean', isNullable: false, default: false }));
    await add(new TableColumn({ name: 'mobile_number', type: 'varchar', length: '30', isNullable: false, default: "''" }));
    await add(new TableColumn({ name: 'alternate_number', type: 'varchar', length: '30', isNullable: true }));
    await add(new TableColumn({ name: 'mobile_verified', type: 'boolean', isNullable: false, default: false }));
    await add(new TableColumn({ name: 'whatsapp_number', type: 'varchar', length: '30', isNullable: true }));
    await add(new TableColumn({ name: 'whatsapp_verified', type: 'boolean', isNullable: false, default: false }));

    await add(new TableColumn({ name: 'location_city', type: 'varchar', length: '100', isNullable: true }));
    await add(new TableColumn({ name: 'location_state', type: 'varchar', length: '100', isNullable: true }));
    await add(new TableColumn({ name: 'nationality', type: 'varchar', length: '100', isNullable: true }));
    await add(new TableColumn({ name: 'gender', type: 'varchar', length: '32', isNullable: true }));
    await add(new TableColumn({ name: 'date_of_birth', type: 'date', isNullable: true }));
    await add(new TableColumn({ name: 'mother_tongue', type: 'varchar', length: '100', isNullable: true }));

    await add(new TableColumn({ name: 'highest_qualification', type: 'varchar', length: '64', isNullable: true }));
    await add(new TableColumn({ name: 'year_of_completion', type: 'int', isNullable: true }));
    await add(new TableColumn({ name: 'years_of_experience', type: 'varchar', length: '64', isNullable: true }));
    await add(new TableColumn({ name: 'university', type: 'varchar', length: '150', isNullable: true }));
    await add(new TableColumn({ name: 'program', type: 'varchar', length: '150', isNullable: true }));
    await add(new TableColumn({ name: 'specialization', type: 'varchar', length: '150', isNullable: true }));
    await add(new TableColumn({ name: 'batch', type: 'varchar', length: '50', isNullable: true }));

    await add(new TableColumn({ name: 'counselor_name', type: 'varchar', length: '150', isNullable: true }));
    await add(new TableColumn({ name: 'counselor_code', type: 'varchar', length: '64', isNullable: true }));

    await add(new TableColumn({ name: 'lead_sub_source', type: 'varchar', length: '100', isNullable: true }));
    await add(new TableColumn({ name: 'created_from', type: 'varchar', length: '150', isNullable: true }));
    await add(new TableColumn({ name: 'lead_status', type: 'varchar', length: '50', isNullable: false, default: "'New'" }));
    await add(new TableColumn({ name: 'lead_sub_status', type: 'varchar', length: '100', isNullable: true }));

    await add(new TableColumn({ name: 'lead_score_percent', type: 'int', isNullable: false, default: 0 }));
    await add(new TableColumn({ name: 'next_follow_up_at', type: 'timestamp', isNullable: true }));

    await add(new TableColumn({ name: 'lead_description', type: 'text', isNullable: true }));
    await add(new TableColumn({ name: 'reason_dead_invalid', type: 'text', isNullable: true }));
    await add(new TableColumn({ name: 'comment', type: 'text', isNullable: true }));

    // Backfill unique reference numbers for existing rows
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS leads_ref_tmp_seq START 10000000`);
    await queryRunner.query(`UPDATE leads SET reference_no = LPAD(nextval('leads_ref_tmp_seq')::text, 10, '0') WHERE reference_no IS NULL OR reference_no = ''`);
    // Enforce NOT NULL and UNIQUE after backfill
    await queryRunner.query(`ALTER TABLE leads ALTER COLUMN reference_no SET NOT NULL`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'UQ_leads_reference_no'
      ) THEN
        CREATE UNIQUE INDEX "UQ_leads_reference_no" ON leads(reference_no);
      END IF;
    END $$;`);

    // Support tables for history and views
    const hasLeadHistories = await queryRunner.hasTable('lead_histories');
    if (!hasLeadHistories) {
      await queryRunner.query(`CREATE TABLE IF NOT EXISTS lead_histories (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        lead_id uuid NOT NULL,
        action varchar(64) NOT NULL,
        changed_by uuid NULL,
        changed_at timestamp NOT NULL DEFAULT now(),
        from_value jsonb NULL,
        to_value jsonb NULL,
        note text NULL
      )`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_lead_histories_lead ON lead_histories(lead_id)`);
    }

    const hasLeadViews = await queryRunner.hasTable('lead_views');
    if (!hasLeadViews) {
      await queryRunner.query(`CREATE TABLE IF NOT EXISTS lead_views (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL,
        name varchar(150) NOT NULL,
        selected_fields jsonb NOT NULL DEFAULT '[]',
        filters jsonb NOT NULL DEFAULT '{}',
        sort_by varchar(64),
        sort_order varchar(4),
        is_default boolean NOT NULL DEFAULT false,
        date_entered timestamp NOT NULL DEFAULT now(),
        date_modified timestamp NOT NULL DEFAULT now()
      )`);
      await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_views_user_name ON lead_views(user_id, name)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Non-destructive down: keep columns; optionally drop support tables
    await queryRunner.query('DROP TABLE IF EXISTS lead_views');
    await queryRunner.query('DROP TABLE IF EXISTS lead_histories');
  }
}
