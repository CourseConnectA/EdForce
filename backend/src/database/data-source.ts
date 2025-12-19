import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config();

const useSSL = (process.env.DATABASE_SSL || '').toLowerCase() === 'true';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'edforce_db',
  entities: [path.join(__dirname, '/entities/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  // Connection pooling for production scalability (handles 50-100+ concurrent users)
  extra: {
    max: parseInt(process.env.DATABASE_POOL_MAX || '50'),          // Maximum connections in pool
    min: parseInt(process.env.DATABASE_POOL_MIN || '5'),           // Minimum connections in pool
    idleTimeoutMillis: 30000,                                       // Close idle connections after 30s
    connectionTimeoutMillis: 5000,                                  // Timeout for new connections
    allowExitOnIdle: true,                                          // Allow pool to close when idle
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;