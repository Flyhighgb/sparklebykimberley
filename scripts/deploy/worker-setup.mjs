// Creates the D1 database and R2 bucket if they don't exist yet, puts the database ID into
// wrangler.toml for this deploy, and makes sure the order tables exist.
import fs from 'node:fs';
import { wrangler } from './lib.mjs';

const DB = 'sparkle-orders';
const BUCKET = 'sparkle-downloads';

const findDb = () => JSON.parse(wrangler(['d1', 'list', '--json'], { quiet: true })).find((d) => d.name === DB);
let db = findDb();
if (!db) {
  console.log(`Creating D1 database ${DB}…`);
  wrangler(['d1', 'create', DB]);
  db = findDb();
}
if (!db?.uuid) throw new Error('Could not find or create the D1 database');
const toml = fs.readFileSync('worker/wrangler.toml', 'utf8').replace(/database_id = ".*"/, `database_id = "${db.uuid}"`);
fs.writeFileSync('worker/wrangler.toml', toml);
console.log(`✔ D1 database ${DB} (${db.uuid})`);

wrangler(['d1', 'execute', DB, '--remote', '--file=schema.sql', '--yes']);
console.log('✔ Order tables are in place');

const buckets = wrangler(['r2', 'bucket', 'list'], { quiet: true });
if (!new RegExp(`\\b${BUCKET}\\b`).test(buckets)) {
  console.log(`Creating R2 bucket ${BUCKET}…`);
  wrangler(['r2', 'bucket', 'create', BUCKET]);
}
console.log(`✔ R2 bucket ${BUCKET}`);
