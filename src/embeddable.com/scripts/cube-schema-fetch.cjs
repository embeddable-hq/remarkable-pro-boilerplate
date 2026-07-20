/**
 * cube-schema-fetch.cjs
 *
 * Two modes:
 *
 *   1. LIST CONNECTIONS (no --connection flag)
 *      Prints all database connection names for the workspace, then exits.
 *      Claude uses this to show the user which connection to pick.
 *
 *   2. INTROSPECT SCHEMA (--connection <name>)
 *      Fetches schemas → tables → columns for the named connection and
 *      prints a single JSON object with the full database schema.
 *      Optionally filter to specific schemas with --schemas public,analytics
 *
 * Authentication:
 *   - Reads the embeddable:login JWT from ~/.embeddable/credentials
 *   - Auto-fetches the workspace API key (needed for /api/v1/connections)
 *     from GET /workspace/{id}/api-key using that JWT
 *
 * Usage:
 *   node src/embeddable.com/scripts/cube-schema-fetch.cjs
 *   node src/embeddable.com/scripts/cube-schema-fetch.cjs --connection my-db
 *   node src/embeddable.com/scripts/cube-schema-fetch.cjs --connection my-db --schemas public,analytics
 *   node src/embeddable.com/scripts/cube-schema-fetch.cjs --workspace <id>
 *
 * Exits 0 on success (JSON to stdout).
 * Exits 1 on auth failure (diagnostic to stderr).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

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
    throw new Error(`HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }

  return resp.json();
}

// ─── Workspace / auth helpers ──────────────────────────────────────────────

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

async function getApiKey(baseUrl, jwt, workspaceId) {
  const data = await apiFetch(`${baseUrl}/workspace/${workspaceId}/api-key`, jwt);
  const key = data?.apiKey ?? data?.api_key ?? '';
  if (!key) throw new Error('Workspace API key not found in response.');
  return key;
}

// ─── Connection helpers ────────────────────────────────────────────────────

async function listConnections(baseUrl, apiKey) {
  const data = await apiFetch(`${baseUrl}/api/v1/connections`, apiKey);
  return data?.connections ?? [];   // string[]
}

async function getSchemas(baseUrl, apiKey, connectionName) {
  return apiFetch(`${baseUrl}/api/v1/connections/${connectionName}/schemas`, apiKey, { method: 'POST' });
  // returns [{ schemaName }]
}

async function getTables(baseUrl, apiKey, connectionName, schemaNames) {
  return apiFetch(`${baseUrl}/api/v1/connections/${connectionName}/tables`, apiKey, {
    method: 'POST',
    body: schemaNames,   // string[]
  });
  // returns [{ schemaName, tableName }]
}

async function getColumns(baseUrl, apiKey, connectionName, tables) {
  return apiFetch(`${baseUrl}/api/v1/connections/${connectionName}/columns`, apiKey, {
    method: 'POST',
    body: tables,    // [{ schemaName, tableName }]
  });
  // returns [{ schemaName, tableName, columnName, dataType, attributes?, foreignKeys? }]
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function run() {
  const baseUrl       = getBaseUrl();
  const jwt           = readJwt();
  const connectionArg = getArg('--connection');
  const schemasArg    = getArg('--schemas');
  const workspaceArg  = getArg('--workspace');

  if (!jwt) {
    process.stderr.write(
      '[cube-schema-fetch] No login token found.\n' +
      'Run: npm run embeddable:login\n',
    );
    process.exit(1);
  }

  // ── Get workspace + API key ──────────────────────────────────────────────
  let workspace, apiKey;
  try {
    workspace = await getWorkspace(baseUrl, jwt, workspaceArg);
    apiKey    = await getApiKey(baseUrl, jwt, workspace.workspaceId);
  } catch (err) {
    if (err.authError) {
      process.stderr.write('[cube-schema-fetch] Token expired or invalid.\nRun: npm run embeddable:login\n');
      process.exit(1);
    }
    process.stderr.write(`[cube-schema-fetch] ${err.message}\n`);
    process.exit(1);
  }

  const { workspaceId } = workspace;

  // ── Mode 1: list connections ─────────────────────────────────────────────
  if (!connectionArg) {
    let connections;
    try {
      connections = await listConnections(baseUrl, apiKey);
    } catch (err) {
      if (err.authError) {
        process.stderr.write('[cube-schema-fetch] API key auth failed.\nRun: npm run embeddable:login\n');
        process.exit(1);
      }
      process.stderr.write(`[cube-schema-fetch] Failed to list connections: ${err.message}\n`);
      process.exit(1);
    }

    process.stdout.write(
      JSON.stringify({ workspaceId, connections }, null, 2) + '\n',
    );
    return;
  }

  // ── Mode 2: introspect schema for a named connection ─────────────────────
  let schemas, tables, columns;
  try {
    schemas = await getSchemas(baseUrl, apiKey, connectionArg);

    // Optionally filter to user-specified schemas; always drop nulls
    let schemaNames = schemas.map((s) => s.schemaName).filter(Boolean);
    if (schemasArg) {
      const requested = schemasArg.split(',').map((s) => s.trim());
      schemaNames = schemaNames.filter((n) => requested.includes(n));
    }

    if (schemaNames.length === 0) throw new Error('No schemas found for this connection.');

    tables = await getTables(baseUrl, apiKey, connectionArg, schemaNames);
    // columns endpoint expects [{ schemaName, tableName }]
    columns = await getColumns(baseUrl, apiKey, connectionArg,
      tables.map((t) => ({ schemaName: t.schemaName, tableName: t.tableName }))
    );
  } catch (err) {
    if (err.authError) {
      process.stderr.write('[cube-schema-fetch] API key auth failed.\nRun: npm run embeddable:login\n');
      process.exit(1);
    }
    process.stderr.write(`[cube-schema-fetch] Schema introspection failed: ${err.message}\n`);
    process.exit(1);
  }

  // Group columns by table for readability
  const byTable = {};
  for (const col of columns) {
    const key = `${col.schemaName}.${col.tableName}`;
    if (!byTable[key]) byTable[key] = { schema: col.schemaName, table: col.tableName, columns: [] };
    byTable[key].columns.push({
      name: col.columnName,
      type: col.dataType,
      ...(col.attributes?.length ? { attributes: col.attributes } : {}),
      ...(col.foreignKeys?.length ? { foreignKeys: col.foreignKeys } : {}),
    });
  }

  process.stdout.write(
    JSON.stringify(
      {
        workspaceId,
        connection: connectionArg,
        schemas,
        tables: Object.values(byTable),
      },
      null,
      2,
    ) + '\n',
  );
}

run().catch((err) => {
  process.stderr.write(`[cube-schema-fetch] Unexpected error: ${err.message}\n`);
  process.exit(1);
});
