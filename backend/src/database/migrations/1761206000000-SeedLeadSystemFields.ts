import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedLeadSystemFields1761206000000 implements MigrationInterface {
    name = 'SeedLeadSystemFields1761206000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Helper to insert a system field if not exists
        const insertIfMissing = async (
            name: string,
            key: string,
            fieldType: string,
            order: number,
            group: string,
            required: boolean,
            targetField: string,
        ) => {
            const exists = await queryRunner.query(
                `SELECT 1 FROM custom_field_definitions WHERE entity_type = 'lead' AND key = $1 LIMIT 1`,
                [key]
            );
            if (exists.length === 0) {
                await queryRunner.query(
                    `INSERT INTO custom_field_definitions (
                        id, entity_type, name, key, field_type, options, required, "order", group_name, help_text, default_value, active, is_system, target_field
                    ) VALUES (
                        uuid_generate_v4(), 'lead', $1, $2, $3, NULL, $4, $5, $6, NULL, NULL, true, true, $7
                    )`,
                    [name, key, fieldType, required, order, group, targetField]
                );
            }
        };

        // Basic Information
        await insertIfMissing('First Name', 'first_name', 'text', 1, 'Basic Information', true, 'firstName');
        await insertIfMissing('Last Name', 'last_name', 'text', 2, 'Basic Information', true, 'lastName');
        await insertIfMissing('Company', 'company', 'text', 3, 'Basic Information', true, 'company');
        await insertIfMissing('Job Title', 'title', 'text', 4, 'Basic Information', false, 'title');
        await insertIfMissing('Status', 'status', 'select', 5, 'Basic Information', false, 'status');
        await insertIfMissing('Lead Source', 'lead_source', 'text', 6, 'Basic Information', false, 'leadSource');
        await insertIfMissing('Industry', 'industry', 'text', 7, 'Basic Information', false, 'industry');

        // Contact Information
        await insertIfMissing('Email', 'email1', 'text', 1, 'Contact Information', false, 'email1');
        await insertIfMissing('Phone', 'phone_work', 'text', 2, 'Contact Information', false, 'phoneWork');
        await insertIfMissing('Website', 'website', 'text', 3, 'Contact Information', false, 'website');

        // Address Information
        await insertIfMissing('Street Address', 'primary_address_street', 'text', 1, 'Address Information', false, 'primaryAddressStreet');
        await insertIfMissing('City', 'primary_address_city', 'text', 2, 'Address Information', false, 'primaryAddressCity');
        await insertIfMissing('State/Province', 'primary_address_state', 'text', 3, 'Address Information', false, 'primaryAddressState');
        await insertIfMissing('Country', 'primary_address_country', 'text', 4, 'Address Information', false, 'primaryAddressCountry');
        await insertIfMissing('Postal Code', 'primary_address_postalcode', 'text', 5, 'Address Information', false, 'primaryAddressPostalcode');

        // Additional Information
        await insertIfMissing('Description', 'description', 'textarea', 1, 'Additional Information', false, 'description');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove only the system fields we added for lead
        await queryRunner.query(`
            DELETE FROM custom_field_definitions
            WHERE entity_type = 'lead' AND is_system = true AND key IN (
                'first_name','last_name','company','title','status','lead_source','industry',
                'email1','phone_work','website',
                'primary_address_street','primary_address_city','primary_address_state','primary_address_country','primary_address_postalcode',
                'description'
            )
        `);
    }
}
