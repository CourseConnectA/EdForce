/*
 Baseline pending TypeORM migrations by inserting them into the migrations table
 without executing their SQL. Useful after initializing a fresh DB via schema:sync.

 Run inside the backend container:
   node tools/migration-baseline.js
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'dist', 'database', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.js'))
    .sort();

  const migrations = [];
  for (const file of files) {
    const match = file.match(/^(\d+)-.*\.js$/);
    if (!match) continue;
    const timestamp = Number(match[1]);
    const mod = require(path.join(migrationsDir, file));
    const exportNames = Object.keys(mod);
    if (exportNames.length === 0) continue;
    const name = exportNames[0]; // Each migration file should export exactly one class
    migrations.push({ timestamp, name, file });
  }

  const config = {
    host: process.env.DATABASE_HOST || 'postgres',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || process.env.POSTGRES_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || '',
    database: process.env.DATABASE_NAME || process.env.POSTGRES_DB || 'postgres',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };

  const client = new Client(config);
  await client.connect();

  try {
    // Ensure migrations table exists (TypeORM default schema)
    await client.query(
      'CREATE TABLE IF NOT EXISTS "migrations" ("id" SERIAL PRIMARY KEY, "timestamp" bigint NOT NULL, "name" character varying NOT NULL)'
    );

    const existing = await client.query('SELECT name FROM migrations');
    const existingNames = new Set(existing.rows.map((r) => r.name));

    const missing = migrations.filter((m) => !existingNames.has(m.name));

    if (missing.length === 0) {
      console.log('No pending migrations to baseline. Database is already aligned.');
      return;
    }

    // Insert in timestamp order
    missing.sort((a, b) => a.timestamp - b.timestamp);

    await client.query('BEGIN');
    for (const m of missing) {
      await client.query('INSERT INTO migrations (timestamp, name) VALUES ($1, $2)', [m.timestamp, m.name]);
      console.log(`Baselined: ${m.name} (${m.timestamp}) from ${m.file}`);
    }
    await client.query('COMMIT');

    console.log(`\nBaseline complete. Marked ${missing.length} migrations as executed.`);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('Baseline failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
