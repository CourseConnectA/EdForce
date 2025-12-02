import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedContactSystemFields1761208000000 implements MigrationInterface {
    name = 'SeedContactSystemFields1761208000000'

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
                `SELECT 1 FROM custom_field_definitions WHERE entity_type = 'contact' AND key = $1 LIMIT 1`,
                [key]
            );
            if (exists.length === 0) {
                await queryRunner.query(
                    `INSERT INTO custom_field_definitions (
                        id, entity_type, name, key, field_type, options, required, "order", group_name, help_text, default_value, active, is_system, target_field
                    ) VALUES (
                        uuid_generate_v4(), 'contact', $1, $2, $3, NULL, $4, $5, $6, NULL, NULL, true, true, $7
                    )`,
                    [name, key, fieldType, required, order, group, targetField]
                );
            }
        };

        // Basic Information
        await insertIfMissing('First Name', 'first_name', 'text', 1, 'Basic Information', true, 'firstName');
        await insertIfMissing('Last Name', 'last_name', 'text', 2, 'Basic Information', true, 'lastName');
        await insertIfMissing('Job Title', 'title', 'text', 3, 'Basic Information', false, 'title');
        await insertIfMissing('Department', 'department', 'text', 4, 'Basic Information', false, 'department');
        await insertIfMissing('Lead Source', 'lead_source', 'text', 5, 'Basic Information', false, 'leadSource');

        // Contact Information
        await insertIfMissing('Email', 'email1', 'text', 1, 'Contact Information', false, 'email1');
        await insertIfMissing('Work Phone', 'phone_work', 'text', 2, 'Contact Information', false, 'phoneWork');
        await insertIfMissing('Mobile Phone', 'phone_mobile', 'text', 3, 'Contact Information', false, 'phoneMobile');
        await insertIfMissing('Home Phone', 'phone_home', 'text', 4, 'Contact Information', false, 'phoneHome');

        // Address Information
        await insertIfMissing('Street Address', 'primary_address_street', 'text', 1, 'Address Information', false, 'primaryAddressStreet');
        await insertIfMissing('City', 'primary_address_city', 'text', 2, 'Address Information', false, 'primaryAddressCity');
        await insertIfMissing('State/Province', 'primary_address_state', 'text', 3, 'Address Information', false, 'primaryAddressState');
        await insertIfMissing('Country', 'primary_address_country', 'text', 4, 'Address Information', false, 'primaryAddressCountry');
        await insertIfMissing('Postal Code', 'primary_address_postalcode', 'text', 5, 'Address Information', false, 'primaryAddressPostalcode');

        // Additional Information
        await insertIfMissing('Birthdate', 'birthdate', 'date', 1, 'Additional Information', false, 'birthdate');
        await insertIfMissing('Assistant', 'assistant', 'text', 2, 'Additional Information', false, 'assistant');
        await insertIfMissing('Assistant Phone', 'assistant_phone', 'text', 3, 'Additional Information', false, 'assistantPhone');
        await insertIfMissing('Do Not Call', 'do_not_call', 'boolean', 4, 'Additional Information', false, 'doNotCall');
        await insertIfMissing('Email Opt Out', 'email_opt_out', 'boolean', 5, 'Additional Information', false, 'emailOptOut');
        await insertIfMissing('Invalid Email', 'invalid_email', 'boolean', 6, 'Additional Information', false, 'invalidEmail');
        await insertIfMissing('Description', 'description', 'textarea', 7, 'Additional Information', false, 'description');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove only the system fields we added for contact
        await queryRunner.query(`
            DELETE FROM custom_field_definitions
            WHERE entity_type = 'contact' AND is_system = true AND key IN (
                'first_name','last_name','title','department','lead_source',
                'email1','phone_work','phone_mobile','phone_home',
                'primary_address_street','primary_address_city','primary_address_state','primary_address_country','primary_address_postalcode',
                'birthdate','assistant','assistant_phone','do_not_call','email_opt_out','invalid_email','description'
            )
        `);
    }
}
