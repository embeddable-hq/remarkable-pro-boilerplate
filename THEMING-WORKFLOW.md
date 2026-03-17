# AI-Assisted Theming Workflow

Apply your brand's look and feel to Embeddable Remarkable Pro using AI — no need to manually dig through CSS variables.

## Prerequisites

- [Cursor IDE](https://cursor.sh) installed
- This repo cloned and opened in Cursor
- A [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens)
- Node.js 18+

## Quick Start

Open Cursor chat and paste this (replacing the placeholders with your own values):

> Apply my Figma design to this project.
> Here is the Figma file: `https://www.figma.com/design/YOUR_FILE_KEY/Your-Design`
> My Figma API token is: `your-figma-token-here`

That's it. The agent will:
1. Extract design tokens from your Figma file automatically
2. Generate and apply a theme to `embeddable.theme.ts`
3. Show you a summary of what was applied

## Refining your theme

After the initial theme is applied, the agent will ask if you'd like any adjustments. You can make as many changes as you want:

> "Set all border radiuses to 4px"

> "Make the chart colors more vibrant"

> "Create a dark mode version"

> "Use a darker background for the cards"

Each change is applied immediately, and the agent shows you what changed.

## Previewing your theme

When you're happy with the result, just say something like **"done"**, **"looks good"**, or **"let's preview"**. The agent will ask for your **Embeddable workspace ID** (the UUID from your dashboard URL) and then start the dev server for you so you can see your themed app in the browser.

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
