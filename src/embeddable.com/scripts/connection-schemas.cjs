require('dotenv').config();

const apiKey = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL;

const connectionName = process.argv[2];

if (!connectionName) {
  console.error('Usage: node run.cjs <connectionName>');
  process.exit(1);
}

async function run() {
  const resp = await fetch(`${BASE_URL}/api/v1/connections/${connectionName}/schemas`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  console.log(`${resp.status} ${resp.statusText}`);

  const text = await resp.text();
  console.log(text);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});