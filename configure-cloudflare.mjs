import { readFileSync, writeFileSync } from 'node:fs';

const id = process.argv[2];
if (!id || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ||
    id === '00000000-0000-0000-0000-000000000000') {
  throw new Error('Provide the UUID of the Cloudflare D1 database.');
}
const config = JSON.parse(readFileSync('wrangler.json', 'utf8'));
config.d1_databases[0].database_id = id;
writeFileSync('wrangler.remote.json', JSON.stringify(config, null, 2) + '\n');
