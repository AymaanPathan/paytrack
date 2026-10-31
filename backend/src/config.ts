import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function loadConfig() {
  const port = Number(required('PORT'));
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be a valid port number');
  }
  return {
    databaseUrl: required('DATABASE_URL'),
    port,
    // Browsers send Origin without a trailing slash, so strip any here.
    frontendUrl: required('FRONTEND_URL').replace(/\/+$/, ''),
  };
}
