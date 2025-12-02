import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLeadFieldSettings1762101000000 implements MigrationInterface {
  name = 'CreateLeadFieldSettings1762101000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lead_field_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(128) NOT NULL,
        visible boolean NOT NULL DEFAULT true,
        required boolean NOT NULL DEFAULT false,
        center_name varchar(150),
        date_entered TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        date_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_lead_field_settings_key ON lead_field_settings(key);`);

    // Seed defaults only if table is empty
    const exists = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM lead_field_settings`);
    const count = Number((exists?.[0]?.cnt ?? 0));
    if (count === 0) {
      // Core mandated defaults
      const defaults: Array<{key: string; visible: boolean; required: boolean}> = [
        { key: 'firstName', visible: true, required: true },
        { key: 'lastName', visible: true, required: true },
        { key: 'email', visible: true, required: true },
        { key: 'mobileNumber', visible: true, required: true },
        { key: 'leadStatus', visible: true, required: false },
        { key: 'alternateNumber', visible: true, required: false },
        { key: 'leadSource', visible: true, required: false },
        { key: 'leadSubSource', visible: true, required: false },
        { key: 'program', visible: true, required: false },
        { key: 'specialization', visible: true, required: false },
        { key: 'yearOfCompletion', visible: true, required: false },
        { key: 'yearsOfExperience', visible: true, required: false },
        { key: 'leadDescription', visible: true, required: false },
        { key: 'nextFollowUpAt', visible: true, required: false },
        { key: 'comment', visible: true, required: false },
        // Additional available fields (initially visible false to keep UI lean)
        { key: 'emailVerified', visible: false, required: false },
        { key: 'mobileVerified', visible: false, required: false },
        { key: 'whatsappNumber', visible: false, required: false },
        { key: 'whatsappVerified', visible: false, required: false },
        { key: 'locationCity', visible: false, required: false },
        { key: 'locationState', visible: false, required: false },
        { key: 'nationality', visible: false, required: false },
        { key: 'gender', visible: false, required: false },
        { key: 'dateOfBirth', visible: false, required: false },
        { key: 'motherTongue', visible: false, required: false },
        { key: 'highestQualification', visible: false, required: false },
        { key: 'university', visible: false, required: false },
        { key: 'batch', visible: false, required: false },
        { key: 'company', visible: false, required: false },
        { key: 'title', visible: false, required: false },
        { key: 'industry', visible: false, required: false },
        { key: 'website', visible: false, required: false },
      ];

      for (const d of defaults) {
        await queryRunner.query(`INSERT INTO lead_field_settings(key, visible, required) VALUES ($1, $2, $3)`, [d.key, d.visible, d.required]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_lead_field_settings_key;`);
    await queryRunner.query(`DROP TABLE IF EXISTS lead_field_settings;`);
  }
}
