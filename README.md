# typedoc-plugin-file-overview

TypeDoc plugin for `typedoc-plugin-markdown` that reads a structured TSDoc file header and renders a `File Overview` block into generated markdown pages.

## What it does

- reads the first file-level TSDoc block
- extracts `@file`, `@summary`, `@feature`, and `@sideEffects`
- injects a compact `File Overview` section before `Defined in:`

## Supported tags

- `@file` required
- `@summary` optional
- `@feature` optional
- `@sideEffects` optional

## Install

If you publish the package:

```bash
pnpm add -D typedoc-plugin-file-overview typedoc typedoc-plugin-markdown
```

Inside this repository, the package already lives in:

```text
packages/typedoc-plugin-file-overview
```

## TypeDoc configuration

Add the markdown plugin and this plugin to `typedoc.json`:

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "plugin": [
    "typedoc-plugin-markdown",
    "./packages/typedoc-plugin-file-overview/dist/index.js"
  ]
}
```

## TSDoc configuration

Define the custom tags in `tsdoc.json` so TSDoc and ESLint accept them:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json",
  "tagDefinitions": [
    { "tagName": "@file", "syntaxKind": "block" },
    { "tagName": "@summary", "syntaxKind": "block" },
    { "tagName": "@feature", "syntaxKind": "block" },
    { "tagName": "@sideEffects", "syntaxKind": "block" }
  ]
}
```

## Input format

Example file header:

```ts
/**
 * @file src/pages/HomePage.tsx
 * @summary Home page that shows the hero and stacked status cards.
 * @feature Routing
 * @sideEffects None
 */
```

## Output

The plugin renders:

```md
## File Overview

| Field | Value |
| --- | --- |
| Path | `src/pages/HomePage.tsx` |
| Feature | Routing |
| Side effects | None |

Home page that shows the hero and stacked status cards.
```

## Sample

See:

- [src/file-header-example.ts](./src/file-header-example.ts)
- [examples/claude-file-header.instructions.md](./examples/claude-file-header.instructions.md)
- [src/prompt-enhancer.ts](./src/prompt-enhancer.ts)
- [src/install_claude_integration.ts](./src/install_claude_integration.ts)

## Claude hook example

If you use Claude Code hooks, you can add a prompt-enrichment hook that nudges edits toward this file header format.

Example `.claude/settings.json` fragment:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/bin/prompt-enhancer.js"
          }
        ]
      }
    ]
  }
}
```

Example instruction block for Claude:

```md
When touching a `.ts` or `.tsx` module, keep a file-level TSDoc header in this format:

/**
 * @file relative/path/to/file.ts
 * @summary One sentence describing the module purpose.
 * @feature Feature area or subsystem.
 * @sideEffects None
 */

If the file already has a header, preserve and normalize it instead of inventing a new shape.
```

## Claude installer

The package also ships with a small installer for Claude Code integration.
The installer example is implemented in TypeScript under `src/` and installs a `.js` hook file from the package build output.

It writes:

- `.claude/bin/prompt-enhancer.js`
- `.claude/instructions/file-header-policy.md`
- `.claude/settings.json` (or merges into existing)

If `.claude/settings.json` already exists, the installer opens a simple console prompt and asks whether it should merge the hook and instruction entries into that file.

## Notes

- this plugin is intended for markdown output via `typedoc-plugin-markdown`
- it reads only the first TSDoc block in the file
- it currently injects the block into reflection pages, not module landing pages

## Local development

From the project root:

```bash
pnpm exec typedoc
```

The current project already uses the package through:

```json
{
  "plugin": [
    "typedoc-plugin-markdown",
    "./packages/typedoc-plugin-file-overview/dist/index.js"
  ]
}
```
