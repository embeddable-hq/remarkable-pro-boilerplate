# AI-Assisted Theming Workflow

Apply your brand's look and feel to Embeddable Remarkable Pro using AI — no need to manually dig through CSS variables.

## Overview

This workflow lets you:
1. Extract design tokens from a Figma file
2. Feed them to an AI agent in Cursor
3. Get a correctly structured `embeddable.theme.ts` that matches your design

## Prerequisites

- [Cursor IDE](https://cursor.sh) installed
- This repo cloned and opened in Cursor
- A [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens)
- Node.js 18+

## Quick Start

### Step 1: Set your Figma token

```bash
export FIGMA_ACCESS_TOKEN="your-figma-token-here"
```

### Step 2: Extract tokens from your Figma file

```bash
npx tsx scripts/extract-figma-tokens.ts "https://www.figma.com/design/YOUR_FILE_KEY/Your-Design"
```

This creates `figma-tokens.json` in the repo root with structured design tokens.

### Step 3: Ask the agent to apply the theme

Open Cursor chat and type:

> Based on the tokens in figma-tokens.json, update embeddable.theme.ts to match this design.

The agent will read the tokens, understand the Embeddable theming model, and generate the correct overrides.

### Step 4: Iterate

You can refine the theme incrementally:

> "Make the chart colors more vibrant"
> "Change the font to Poppins"
> "Set all border radiuses to 4px"
> "Create a dark mode version"

## How It Works

### Figma Extraction (`scripts/extract-figma-tokens.ts`)

The script hits the Figma API and extracts:
- **Color styles** → classified as background, text, status, or chart colors
- **Text styles** → font family, size, weight, line height
- **Effect styles** → shadows
- **Auto-mapped candidates** → the script guesses which Figma colors map to which Embeddable semantic tokens

### AI Rules (`.cursor/rules/theming-agent.mdc`)

The cursor rules file teaches the agent:
- The 3-layer token system (core → semantic → component)
- Which tokens to modify (semantic) and which to leave alone (core)
- How to map Figma concepts to Embeddable tokens
- How to structure the output TypeScript file
- Quality checks to verify before outputting

### Theming Reference (`.cursor/theming-reference.md`)

Comprehensive reference document with:
- Every CSS variable name and its role
- The Theme type shape
- Chart color configuration
- Font handling
- Dark mode patterns
- Complete examples

## Advanced Usage

### Working without Figma

You can describe themes in natural language too:

> "Create a dark theme with a deep navy background (#0f172a), bright teal chart colors, and the Outfit font"

> "Match these CSS variables from our design system: --primary: #6366f1, --surface: #fafafa, --text: #1e293b"

### Multiple themes

> "Add a second theme for dark mode. Keep the same chart colors but invert the backgrounds and text."

The agent will create a separate theme file and update the theme provider to switch between them.

### Per-component tweaks

> "Make the card border radius 16px and add a subtle border"

> "Style the table headers with a darker background"

The agent knows to use component-level tokens for these targeted changes.

## Figma File Tips

For best extraction results, make sure your Figma file has:

1. **Published color styles** — the script reads published local styles, not just fills on frames
2. **Descriptive style names** — names like "Background/Primary" or "Text/Muted" map automatically to the right tokens; names like "Color 1" need manual guidance
3. **Chart/data colors** as a named group — prefix with "Chart/", "Series", or "Data" for automatic detection
4. **Text styles published** — for font family and size extraction

## Script Options

```bash
# Custom output path
npx tsx scripts/extract-figma-tokens.ts <URL> --output my-tokens.json

# Using a file key directly
npx tsx scripts/extract-figma-tokens.ts abc123def456
```

## Measuring Quality

### Token correctness
The agent should only use `--em-sem-*` tokens for global appearance. Check the output:
```bash
# Should find semantic tokens (good)
grep -c "em-sem-" embeddable.theme.ts

# Should NOT find core color overrides (bad, unless intentional)
grep -c "em-core-color" embeddable.theme.ts
```

### Variation stability
Run the same prompt 5 times and compare outputs. Lower variance = more reliable.

### Expected output tests
Compare against known-good themes in `scripts/figma-tokens.example.json`.
