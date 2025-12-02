import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedOpportunitySystemFields1761209000000 implements MigrationInterface {
    name = 'SeedOpportunitySystemFields1761209000000'

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
                `SELECT 1 FROM custom_field_definitions WHERE entity_type = 'opportunity' AND key = $1 LIMIT 1`,
                [key]
            );
            if (exists.length === 0) {
                await queryRunner.query(
                    `INSERT INTO custom_field_definitions (
                        id, entity_type, name, key, field_type, options, required, "order", group_name, help_text, default_value, active, is_system, target_field
                    ) VALUES (
                        uuid_generate_v4(), 'opportunity', $1, $2, $3, NULL, $4, $5, $6, NULL, NULL, true, true, $7
                    )`,
                    [name, key, fieldType, required, order, group, targetField]
                );
            }
        };

        // Basic Information
        await insertIfMissing('Name', 'name', 'text', 1, 'Basic Information', true, 'name');
        await insertIfMissing('Amount', 'amount', 'number', 2, 'Basic Information', false, 'amount');
        await insertIfMissing('Sales Stage', 'sales_stage', 'select', 3, 'Basic Information', true, 'salesStage');
        await insertIfMissing('Probability (%)', 'probability', 'number', 4, 'Basic Information', false, 'probability');
        await insertIfMissing('Expected Close Date', 'date_closed_expected', 'date', 5, 'Basic Information', false, 'dateClosedExpected');
        await insertIfMissing('Lead Source', 'lead_source', 'text', 6, 'Basic Information', false, 'leadSource');

        // Relationship Information
        await insertIfMissing('Account', 'account_id', 'text', 1, 'Relationships', true, 'accountId');
        await insertIfMissing('Primary Contact', 'contact_id', 'text', 2, 'Relationships', false, 'contactId');
        await insertIfMissing('Assigned User', 'assigned_user_id', 'text', 3, 'Relationships', false, 'assignedUserId');
        await insertIfMissing('Campaign', 'campaign_id', 'text', 4, 'Relationships', false, 'campaignId');

        // Additional Information
        await insertIfMissing('Next Step', 'next_step', 'text', 1, 'Additional Information', false, 'nextStep');
        await insertIfMissing('Description', 'description', 'textarea', 2, 'Additional Information', false, 'description');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove only the system fields we added for opportunity
        await queryRunner.query(`
            DELETE FROM custom_field_definitions
            WHERE entity_type = 'opportunity' AND is_system = true AND key IN (
                'name','amount','sales_stage','probability','date_closed_expected','lead_source',
                'account_id','contact_id','assigned_user_id','campaign_id',
                'next_step','description'
            )
        `);
    }
}
