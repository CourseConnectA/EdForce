import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SchemaService {
  constructor(private readonly dataSource: DataSource) {}

  async getTableColumns(tableName: string, schema = 'public') {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    const result = await this.dataSource.query(query, [schema, tableName]);
    return result;
  }

  async viewExists(viewName: string, schema = 'public') {
    const q = `SELECT viewname FROM pg_views WHERE schemaname=$1 AND viewname=$2`;
    const r = await this.dataSource.query(q, [schema, viewName]);
    return r.length > 0;
  }
}
