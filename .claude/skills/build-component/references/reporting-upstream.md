# Reporting a Remarkable library bug upstream

When the [Out of scope](../SKILL.md#out-of-scope) rule applies — you've concluded the problem is a **defect in `@embeddable.com/remarkable-pro` or `@embeddable.com/remarkable-ui`**, not something to work around in a custom component — don't just say "fix it centrally." Help the user file it, so the fix lands where every consumer benefits.

This repo files via a **prefilled GitHub issue link**: you draft the title and body and produce an `issues/new?…` URL; the **user clicks it, reviews in the browser, and submits**. No `gh` auth is required, and a human always does the actual filing. **Do not `gh issue create`** for this — filing is the user's click, by design.

## Before drafting
1. **Confirm it's a library defect, not usage.** Re-check the component's inputs/props and the data shape first — a misconfigured input or a wrong member name is not an upstream bug. Only proceed if correct, documented usage still produces wrong output.
2. **Identify the owning package**, which picks the repo:
   - `@embeddable.com/remarkable-pro` → `embeddable-hq/remarkable-pro`
   - `@embeddable.com/remarkable-ui` → `embeddable-hq/remarkable-ui`

   Grep `dist` for where the buggy component/primitive is exported to be sure which library owns it (see [discovery-and-validation.md](discovery-and-validation.md)). Confirm the exact repo slug with the user if unsure.
3. **Capture the installed version** of that package:
   ```bash
   node -p "require('@embeddable.com/remarkable-pro/package.json').version"
   ```
4. **Check for a duplicate.** Ask the user to scan the repo's open issues for the same symptom before sharing the link (browser only — no auth).

## Build the prefilled link
Fill in `REPO`, `T` (title), and `B` (body), then run:
```bash
REPO="embeddable-hq/remarkable-pro"   # or embeddable-hq/remarkable-ui
T="<Component>: <one-line symptom>"
B="$(cat <<'EOF'
### Package & version
@embeddable.com/remarkable-pro@<version>

### What happens
<the incorrect render/behaviour>

### Expected
<what should happen instead>

### Minimal repro
<smallest component config + data that triggers it; a definePreview snippet is ideal>

### Environment
- boilerplate commit: <git rev-parse --short HEAD>
- browser / OS: <…>
EOF
)"
T="$T" B="$B" REPO="$REPO" python3 - <<'PY'
import os, urllib.parse
base = f"https://github.com/{os.environ['REPO']}/issues/new"
print(f"{base}?" + urllib.parse.urlencode({"title": os.environ["T"], "body": os.environ["B"]}))
PY
```
Give the printed URL to the user to open, review, and submit. (Any URL-encoder works; `python3` is just what's reliably present on macOS.)

## Notes
- **URL length limit.** A prefilled link encodes the whole body into the query string; very long bodies (≳8 KB) can be rejected. Keep the repro tight. If it's still too long, hand the user the body as plain text to paste into a blank issue instead.
- **Report vs. fix.** This is the *report* path. If the user actually maintains the library and wants to *fix* it, that work happens in the `remarkable-pro` / `remarkable-ui` repos — not here.
