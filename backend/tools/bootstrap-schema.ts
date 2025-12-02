import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';

(async () => {
  const dataSource = new DataSource({
    ...dataSourceOptions,
    synchronize: true,
    migrationsRun: false,
  });

  try {
    await dataSource.initialize();
    await dataSource.synchronize();
    console.log('✅ Database schema synchronized from entities.');
  } catch (error) {
    console.error('❌ Failed to synchronize schema:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
})();
