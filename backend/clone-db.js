const { Client } = require('pg');

(async () => {
  const admin = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  try {
    await admin.connect();
    // Terminate existing connections to edforce_db
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'edforce_db' AND pid <> pg_backend_pid();`);
    await admin.query('DROP DATABASE IF EXISTS edforce_db');
    await admin.query(`CREATE DATABASE edforce_db WITH TEMPLATE cc_crm_db OWNER postgres`);
    console.log(' edforce_db cloned from cc_crm_db.');
  } catch (err) {
    console.error(' Failed to clone database:', err.message);
    process.exitCode = 1;
  } finally {
    await admin.end();
  }
})();
