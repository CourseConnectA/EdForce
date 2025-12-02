import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCallLogsTable1732100000000 implements MigrationInterface {
    name = 'CreateCallLogsTable1732100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS call_logs (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                lead_id uuid NOT NULL,
                user_id uuid NOT NULL,
                phone_number varchar(30) NOT NULL,
                call_type varchar(20) NOT NULL,
                start_time timestamp NOT NULL,
                end_time timestamp,
                duration int NOT NULL DEFAULT 0,
                disposition varchar(50),
                notes text,
                synced boolean NOT NULL DEFAULT false,
                device_call_log_id varchar(100),
                center_name varchar(150),
                date_entered timestamp NOT NULL DEFAULT now(),
                date_modified timestamp NOT NULL DEFAULT now(),
                created_by uuid,
                modified_by uuid,
                deleted boolean NOT NULL DEFAULT false,
                CONSTRAINT fk_call_logs_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
                CONSTRAINT fk_call_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
            );
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_user ON call_logs(user_id);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_type ON call_logs(call_type);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_start ON call_logs(start_time);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_center ON call_logs(center_name);`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_call_logs_device_id ON call_logs(device_call_log_id);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_logs_device_id;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_logs_center;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_logs_start;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_logs_type;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_logs_user;`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_call_logs_lead;`);
        await queryRunner.query(`DROP TABLE IF EXISTS call_logs;`);
    }
}
