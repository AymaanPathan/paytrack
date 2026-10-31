import { createApp } from './app';
import { loadConfig } from './config';
import { createPool, initDb } from './db';

async function main() {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  await initDb(pool);
  createApp(pool, config.frontendUrl).listen(config.port, () => {
    console.log(`paytrack API listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start', err);
  process.exit(1);
});
