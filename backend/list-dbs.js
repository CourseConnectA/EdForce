const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY 1");
    console.table(res.rows);
  } catch (err) {
    console.error('Error listing databases:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
