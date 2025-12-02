import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCounselorCodeToUsers1730790000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    const existingColumn = usersTable?.findColumnByName('counselor_code');

    if (!existingColumn) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'counselor_code',
        type: 'varchar',
        length: '16',
        isNullable: true,
        isUnique: true,
      }));
    }

    // Backfill unique codes for existing users (best-effort)
    const rows: Array<{ id: string; counselor_code: string | null }> = await queryRunner.query(`SELECT id, counselor_code FROM users`);
    const used = new Set<string>((rows || []).map(r => r.counselor_code).filter(Boolean));
    const gen = (): string => `#${Math.floor(100000 + Math.random() * 900000)}`;

    const updates: Array<{ id: string; code: string }> = [];
    for (const r of rows) {
      if (r.counselor_code) continue;
      let code = gen();
      let tries = 0;
      while (used.has(code) && tries < 10) { code = gen(); tries++; }
      used.add(code);
      updates.push({ id: r.id, code });
    }

    for (const u of updates) {
      await queryRunner.query(`UPDATE users SET counselor_code = $1 WHERE id = $2`, [u.code, u.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');
    const existingColumn = usersTable?.findColumnByName('counselor_code');

    if (existingColumn) {
      await queryRunner.dropColumn('users', 'counselor_code');
    }
  }
}
