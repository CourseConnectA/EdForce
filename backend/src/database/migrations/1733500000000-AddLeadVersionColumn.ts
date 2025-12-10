import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLeadVersionColumn1733500000000 implements MigrationInterface {
  name = 'AddLeadVersionColumn1733500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists
    const table = await queryRunner.getTable('leads');
    const versionColumn = table?.findColumnByName('version');
    
    if (!versionColumn) {
      await queryRunner.addColumn(
        'leads',
        new TableColumn({
          name: 'version',
          type: 'int',
          default: 1,
          isNullable: false,
        }),
      );
      console.log('Added version column to leads table for optimistic locking');
    } else {
      console.log('Version column already exists in leads table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('leads');
    const versionColumn = table?.findColumnByName('version');
    
    if (versionColumn) {
      await queryRunner.dropColumn('leads', 'version');
      console.log('Removed version column from leads table');
    }
  }
}
