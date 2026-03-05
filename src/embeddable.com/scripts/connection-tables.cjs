require('dotenv').config();
const fs = require('fs/promises');

const apiKey = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;

if (!apiKey) {
  console.error('Missing env API_KEY');
  process.exit(1);
}
if (!BASE_URL) {
  console.error('Missing env BASE_URL');
  process.exit(1);
}

// Usage:
//   node tables.cjs <connectionName> <schemas.json>
// or:
//   cat schemas.json | node tables.cjs <connectionName> -
const connectionName = process.argv[2];
const input = process.argv[3];

if (!connectionName || !input) {
  console.error('Usage: node tables.cjs <connectionName> <schemas.json|->');
  process.exit(1);
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function loadPayload() {
  const raw = input === '-' ? await readStdin() : await fs.readFile(input, 'utf8');

  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON payload');
    throw e;
  }

  if (!Array.isArray(json) || !json.every((x) => typeof x === 'string' && x.trim().length > 0)) {
    throw new Error('Payload must be an array of non-empty strings: ["schema1", "schema2"]');
  }

  return json;
}

async function run() {
  const payload = await loadPayload();

  const url = `${BASE_URL}/api/v1/connections/${encodeURIComponent(connectionName)}/tables`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  console.log(`${resp.status} ${resp.statusText}`);
  const text = await resp.text();
  console.log(text);
}

run().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});