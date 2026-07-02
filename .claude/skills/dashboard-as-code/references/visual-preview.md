# Visual preview (Playwright)

A visual self-check to offer after generating or editing a `*.embeddable.yml`: open the live preview in the user's browser and *look* at the dashboard you produced — catch render/layout/data problems that YAML validation can't see, then fix them. Offering it is routine (every edit); actually running it is opt-in (needs the user's yes + Playwright + a running dev server).

This is **opt-in and user-gated**. Never drive the browser silently. It relies on the user's own `embeddable:dev` session (which they start themselves) plus `playwright-cli`, Microsoft's CLI for coding agents.

## When to offer it

**Offer it every time you create or edit a `*.embeddable.yml`** — make it a routine closing line: *"Want me to open it in your browser and check how it renders?"* Do **not** pre-gate the *offer* on whether `embeddable:dev` is running or Playwright is installed; offer first, sort out prerequisites only if the user accepts. That way the offer is reliable instead of silently dropped on simple edits.

Proceed only on a yes. If the user declines, stop — the YAML you wrote still stands.

Once the user accepts:

1. If the events log has unresolved validation errors (see [SKILL.md](../SKILL.md) → "Dev events log"), **fix those first** — a dashboard that fails validation won't render meaningfully.
2. Run the readiness check (Step 1). If Playwright or `embeddable:dev` isn't ready, say so and suggest the fix (`npm run playwright:setup`, or ask the user to start `embeddable:dev`) rather than silently skipping.

## Two error channels — don't confuse them

- **Build / validation errors** → the NDJSON `--events-file` log (`validation_error` etc.). These mean the YAML is structurally wrong. **Fix these first**, before looking at pixels.
- **Runtime / visual errors** → visible on the rendered page (blank widgets, failed data queries, broken layout, console errors). This file is about *these*.

## Step 1 — Check that Playwright is ready

Detect, in order:

1. **CLI present** — run `playwright-cli --version` (or `npx playwright-cli --version`). If it fails, `@playwright/cli` isn't installed.
2. **Agent skills installed** — the setup step drops a `playwright-cli` skill under `.claude/skills/playwright-cli/`. If that directory is absent, setup hasn't been run.

If anything is missing, **suggest the setup and stop** (don't run installs yourself — see root `CLAUDE.md`):

```bash
npm install            # if @playwright/cli isn't in node_modules yet
npm run playwright:setup   # installs the playwright-cli agent skills
```

`playwright:setup` runs `playwright-cli install --skills`.

**No Playwright browser download is needed.** Extension mode (below) drives the user's *own* already-running browser, so `playwright-cli` never launches its own bundled browser — don't run `install-browser`. (If some fallback ever launches a browser itself, the CLI downloads one on first use automatically.)

**One-time browser connection (Extension mode).** This skill reuses the user's *already-open* browser so their Embeddable login is preserved and they watch it happen live. That needs the **"Playwright" Chrome extension** (Chrome Web Store) installed once. You can't install it for them — if `attach --extension` later reports no browser, tell the user to install that extension and reload their Embeddable tab.

## Step 2 — Get the preview URL from the dev log

The URL is **not fixed** — read it from the log, don't guess.

1. Find the `--log-file=<path>` (or `--log-file <path>`) flag in the `embeddable:dev` (or `dev`) script in `package.json`. If it's absent, the URL log isn't configured — tell the user to add the flag (mirrors the `--events-file` guidance in [SKILL.md](../SKILL.md)) rather than guessing a path.
2. In that log, find the line beginning `Preview workspace is available at` and **take the URL that follows verbatim** — do not assume or construct the host. It looks like:
   ```
   ℹ Preview workspace is available at https://app.<region>.embeddable.com/workspace/<workspace-id>
   ```
   The host is region-specific: `app.us.embeddable.com` or `app.eu.embeddable.com`. Match on the message text and copy whatever URL is printed — never hardcode a region. If the line isn't there yet, `embeddable:dev` is still starting or mid-build — wait for it, or tell the user it isn't ready.

That URL opens the **workspace's embeddables list**, not a specific dashboard.

## Step 3 — Open the dashboard the user is working on

The mechanics of driving the browser (`attach`, `open`, `snapshot`, `click`, `screenshot`, `console`, session `-s=` flag) are documented by the installed **`playwright-cli` skill** under `.claude/skills/playwright-cli/` — defer to it for exact syntax and options. What's Embeddable-specific:

1. **Attach to the user's browser** using extension mode with a stable session name, e.g.
   ```bash
   playwright-cli attach --extension=chrome -s=embeddable-preview
   ```
2. **Open the workspace URL** from Step 2 in that session. This shows the **"Your Embeddables"** list.
3. **Find the dashboard by its `title`.** In the list, match the exact `title` string from the YAML you just edited — *not* the `name` (the workspace identifier) and *not* the filename. Example:
   ```yaml
   embeddables:
     - name: spotify-artist-dashboard          # identifier — NOT shown in the list
       title: '[Example (YAML)] Spotify Artist dashboard'   # THIS is the list label
   ```
   Snapshot the page to locate the list item with that text, then click it. You land on the dashboard's preview (`.../preview/<embeddable-id>`).
4. If a file defines **multiple embeddables**, repeat for each `title` you care about (or the one the user asked about).

## Step 4 — Observe (this is where "seeing" matters)

**Wait for load first.** Widgets show a spinner while their query runs. A spinner is *loading*, not an error — don't judge until spinners resolve to content (or to a genuine error state). If a spinner never resolves, that itself is a signal (usually a failing query — check the console/SQL).

Then combine three lenses:

- **Screenshot → actually look at it.** `playwright-cli … screenshot --filename=.playwright-cli/preview.png` (playwright-cli's own `.playwright-cli/` scratch dir is gitignored), then open that PNG with the `Read` tool so you *see* the pixels. This is the only way to catch layout breakage, overlaps, clipped labels, wrong theme/colors, empty-looking charts.
- **Console → read it as text.** `playwright-cli … console error` for errors, plain `console` for the full event stream. Embeddable logs each widget's data request, its **generated SQL**, and **variable updates** here — a failed query shows up as a console error, often more precisely than on screen.
- **DOM snapshot → read error text.** `playwright-cli … snapshot` surfaces error-banner text, "No data", "component not found", and per-widget states without eyeballing.

**The in-page Console panel** (right side of the preview) is Embeddable's own event feed — data requests with their params, the generated SQL per request, variable-change events, and errors; entries are expandable. Errors typically render **both** in that panel **and inside the affected widget**. Use the panel screenshot for what the human sees; use `console`/`snapshot` to read it as text.

### What to look for

- Error banners / toasts / "Something went wrong" overlays; "component not found".
- A widget rendering an **error state inside its own box** (not just blank).
- **Blank widget vs. "No data" vs. still-loading** — distinguish these; only the first two are problems, and "No data" may be a legitimate empty result, not a bug.
- Broken layout: overlapping widgets, off-grid placement, clipped/truncated titles or axis labels.
- A chart that rendered but whose data is obviously wrong — all zeros, empty series, a single bar where you expected many.
- Console `Error` entries, and failed data requests — cross-reference the generated SQL in the console to see what the widget actually queried.

## Step 5 — Fix and re-check

`embeddable:dev` **hot-reloads** — when you edit the YAML, the open preview updates on its own. So the loop is tight:

1. Map the symptom to a YAML cause (wrong dimension/measure, missing `dataset`, bad filter, overlapping grid coords, wrong `component`, an input that needs a paired variable — see [widgets.md](widgets.md) / [datasets.md](datasets.md)).
2. Edit the YAML.
3. Let the page hot-reload (or wait for the next `validate_end` in the events log).
4. Re-screenshot and re-read the console in the **same** attached session — no need to re-navigate. Repeat until clean.

Ground every fix in the real models — never invent a cube/dimension/measure to make an error go away (see [SKILL.md](../SKILL.md) safety rules).

## Etiquette

- **Ask before every browsing session** — reusing the user's browser means they see (and share) it; get a yes first.
- **Never start `embeddable:dev` yourself** — the user starts it (root `CLAUDE.md`).
- **Observe, don't mutate.** Navigate, screenshot, read the console. Do **not** click `Publish`, delete, or other state-changing controls in the workspace UI.
- **Screenshots go to a gitignored path** (playwright-cli's `.playwright-cli/` scratch dir), never committed.
- If Playwright isn't available and the user doesn't want to set it up, that's fine — skip the visual check and hand off the YAML as-is.
