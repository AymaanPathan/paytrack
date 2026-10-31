import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { loadConfig } from './config';

const NAMES = ['DATABASE_URL', 'PORT', 'FRONTEND_URL'];
const saved = new Map(NAMES.map((name) => [name, process.env[name]]));

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://test/db';
  process.env.PORT = '4000';
  process.env.FRONTEND_URL = 'http://frontend.test';
});

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('reads all three values from the environment', () => {
  assert.deepEqual(loadConfig(), {
    databaseUrl: 'postgres://test/db',
    port: 4000,
    frontendUrl: 'http://frontend.test',
  });
});

test('strips trailing slashes so FRONTEND_URL matches a browser Origin', () => {
  process.env.FRONTEND_URL = 'http://frontend.test//';
  assert.equal(loadConfig().frontendUrl, 'http://frontend.test');
});

for (const name of NAMES) {
  test(`refuses to start without ${name}`, () => {
    delete process.env[name];
    assert.throws(loadConfig, new RegExp(name));
  });
}

test('rejects a PORT that is not a valid port', () => {
  for (const port of ['abc', '-1', '65536', '80.5']) {
    process.env.PORT = port;
    assert.throws(loadConfig, /PORT/, port);
  }
});
