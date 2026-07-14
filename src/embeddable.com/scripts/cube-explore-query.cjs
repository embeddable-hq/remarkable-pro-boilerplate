/**
 * cube-explore-query.cjs
 *
 * Runs a query against a named database connection through the Embeddable
 * playground/explore endpoint. Requires an existing Cube model to be defined for
 * the connection (use after generating *.cube.yml files).
 *
 * Authentication:
 *   - Reads the embeddable:login JWT from ~/.embeddable/credentials
 *   - Uses the JWT directly for /workspace/{id}/playground/explore (no API key needed)
 *
 * Usage:
 *   node src/embeddable.com/scripts/cube-explore-query.cjs \
 *     --cube orders.cube.yml \
 *     --query '{"measures":["orders.count"],"limit":1}'
 *
 *   node src/embeddable.com/scripts/cube-explore-query.cjs \
 *     --cube orders.cube.yml \
 *     --query '{"dimensions":["orders.status"],"measures":["orders.count"],"limit":20}'
 *
 * --cube        Required. Path to a *.cube.yml file to send inline with the query.
 * --query       Required. JSON string in Cube.js query format (the cubeQuery object).
 * --workspace   Optional. Override workspace ID (skips the API lookup).
 *
 * cubeQuery format:
 *   {
 *     "measures":       ["cube.measure_name"],
 *     "dimensions":     ["cube.dimension_name"],
 *     "filters":        [{"member":"cube.dim","operator":"equals","values":["x"]}],
 *     "timeDimensions": [{"dimension":"cube.date","granularity":"month","dateRange":"last 3 months"}],
 *     "order":          [["cube.count", "desc"]],
 *     "limit":          50,
 *     "offset":         0,
 *     "timezone":       "UTC"
 *   }
 *
 * Exits 0 on success (JSON to stdout).
 * Exits 1 on auth failure or query error (diagnostic to stderr).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml')

// ─── Config ────────────────────────────────────────────────────────────────

const CREDENTIALS_FILE = path.join(os.homedir(), '.embeddable', 'credentials');

function getBaseUrl() {
  try {
    const configPath = path.join(process.cwd(), 'embeddable.config.ts');
    const content = fs.readFileSync(configPath, 'utf-8');
    // Prefer explicit pushBaseUrl override (e.g. localhost for local dev)
    const pushBaseUrlMatch = content.match(/pushBaseUrl\s*:\s*['"]([^'"]+)['"]/);
    if (pushBaseUrlMatch) return pushBaseUrlMatch[1].replace(/\/$/, '');
    // Fall back to region-derived URL
    const regionMatch = content.match(/region\s*:\s*['"]([^'"]+)['"]/);
    const region = regionMatch?.[1] ?? 'EU';
    return region === 'US'
      ? 'https://api.us.embeddable.com'
      : 'https://api.eu.embeddable.com';
  } catch {
    return 'https://api.eu.embeddable.com';
  }
}

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function readJwt() {
  try {
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(raw)?.access_token ?? '';
  } catch {
    return '';
  }
}

// ─── API helpers ───────────────────────────────────────────────────────────

async function apiFetch(url, token, { method = 'GET', body } = {}) {
  const resp = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (resp.status === 401 || resp.status === 403) {
    throw Object.assign(new Error('Authentication failed'), { authError: true });
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 400)}`);
  }

  return resp.json();
}

async function getWorkspace(baseUrl, jwt, explicitId) {
  if (explicitId) return { workspaceId: explicitId };

  const data = await apiFetch(`${baseUrl}/workspace`, jwt);
  const workspaces = (Array.isArray(data) ? data : (data.workspaces ?? []))
    .filter((w) => !w.devWorkspace);

  if (workspaces.length === 0) throw new Error('No non-dev workspaces found.');

  if (workspaces.length > 1) {
    // Print workspace list and exit — caller must pick one via --workspace
    process.stdout.write(
      JSON.stringify({
        action: 'choose_workspace',
        message: 'Multiple workspaces found. Re-run with --workspace <workspaceId>.',
        workspaces: workspaces.map((w) => ({ workspaceId: w.workspaceId, name: w.name })),
      }, null, 2) + '\n',
    );
    process.exit(0);
  }
  return workspaces[0];
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function run() {
  const baseUrl       = getBaseUrl();
  const jwt           = readJwt();
  const cubeArg       = getArg('--cube');
  const queryArg      = getArg('--query');
  const workspaceArg  = getArg('--workspace');

  // ── Validate args ────────────────────────────────────────────────────────
  if (!jwt) {
    process.stderr.write('[cube-explore-query] No login token found.\nRun: npm run embeddable:login\n');
    process.exit(1);
  }

  const missing = ['--cube', '--query'].filter((f) => !getArg(f));
  if (missing.length) {
    process.stderr.write(
      `[cube-explore-query] Missing required flags: ${missing.join(', ')}\n` +
      `Example:\n` +
      `  node src/embeddable.com/scripts/cube-explore-query.cjs \\\n` +
      `    --cube orders.cube.yml \\\n` +
      `    --query '{"measures":["orders.count"],"limit":1}'\n`,
    );
    process.exit(1);
  }

  let parsedModel;
  try {
    parsedModel = yaml.load(fs.readFileSync(cubeArg), 'utf8')
  } catch(e) {
    process.stderr.write(`[cube-explore-query] Invalid model in --cube: ${e.message}\n`);
    process.exit(1);
  }
  let cubeQuery;
  try {
    cubeQuery = JSON.parse(queryArg);
  } catch (e) {
    process.stderr.write(`[cube-explore-query] Invalid JSON in --query: ${e.message}\n`);
    process.exit(1);
  }

  // ── Get workspace ────────────────────────────────────────────────────────
  let workspace;
  try {
    workspace = await getWorkspace(baseUrl, jwt, workspaceArg);
  } catch (err) {
    if (err.authError) {
      process.stderr.write('[cube-explore-query] Token expired or invalid.\nRun: npm run embeddable:login\n');
      process.exit(1);
    }
    process.stderr.write(`[cube-explore-query] ${err.message}\n`);
    process.exit(1);
  }

  const { workspaceId } = workspace;
  const queryUrl = `${baseUrl}/workspace/${workspaceId}/playground/explore`;

  // ── Execute query ────────────────────────────────────────────────────────
  let result;
  try {
    result = await apiFetch(queryUrl, jwt, {
      method: 'POST',
      body: {
        cubeModel: yaml.dump(parsedModel),
        cubeQuery: cubeQuery,
      },
    });
  } catch (err) {
    if (err.authError) {
      process.stderr.write('[cube-explore-query] Token expired or invalid.\nRun: npm run embeddable:login\n');
      process.exit(1);
    }
    process.stderr.write(`[cube-explore-query] Query failed: ${err.message}\n`);
    process.exit(1);
  }

  process.stdout.write(
    JSON.stringify({ workspaceId, cubeModel: cubeArg, cubeQuery, result }, null, 2) + '\n',
  );
}

run().catch((err) => {
  process.stderr.write(`[cube-explore-query] Unexpected error: ${err.message}\n`);
  process.exit(1);
});
