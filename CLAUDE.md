# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TypeDoc plugin that reads structured TSDoc file headers (`@file`, `@summary`, `@feature`, `@sideEffects`) and injects a formatted `File Overview` block into generated markdown pages via `typedoc-plugin-markdown`.

Published as `typedoc-plugin-file-overview`. Also ships with a Claude Code integration installer that adds file-header hooks and instructions to downstream projects.

## Commands

```bash
npm run build              # tsc -p tsconfig.build.json → ./dist
npm run test               # vitest run --config vitest.config.ts
npm run typecheck          # tsc -p tsconfig.json --noEmit
```

## Architecture

### Plugin entry point: `src/index.ts`

Exports `load(app)` — called by TypeDoc during plugin initialization. Registers an event listener on `MarkdownPageEvent.END`:

- Checks if page is a reflection (not module landing page)
- Reads source file path from `page.model.sources[0].fullFileName`
- Calls `readFileTagMetadata()` to parse the first JSDoc block
- Injects markdown via `injectFileTag()` before "Defined in:" or after page title

**Key functions:**

- `parseFileCommentMetadata(lines)` — parses normalized comment lines and extracts tag values
- `readFileTagMetadata(path)` — reads file, extracts first JSDoc block, parses metadata, caches result
- `renderFileTagMarkdown(metadata)` — builds markdown table (path, feature, side effects) + summary text
- `injectFileTag(page, metadata)` — inserts markdown into page contents at correct position

### Supporting modules

- `src/prompt-enhancer.ts` — CLI tool that nudges Claude prompts toward the file header format (piped by Claude hook)
- `src/install_claude_integration.ts` — Installer that writes hook scripts and instructions to `.claude/` in downstream projects

### File header format (input)

The plugin expects this structure at the top of any file:

```ts
/**
 * @file relative/path/to/file.ts
 * @summary One sentence describing the module purpose.
 * @feature Feature area or subsystem (optional).
 * @sideEffects None or description (optional).
 */
```

All four tags are optional except `@file`.

### Rendered output (markdown)

```md
## File Overview

| Field | Value |
| --- | --- |
| Path | `src/pages/HomePage.tsx` |
| Feature | Routing |
| Side effects | None |

Home page summary text here.
```

## Design notes

- **Caching:** Metadata is cached in-memory to avoid re-reading and re-parsing the same files across multiple reflections.
- **First JSDoc only:** The plugin reads only the first `/** ... */` block in the source file (via regex).
- **Injection strategy:** Prefers placing the block before "Defined in:" (reflection detail). Falls back to after page title, then at top.
- **Scope:** Only injects into reflection pages (`isReflectionEvent()`), not module landing pages or other markdown types.
- **Peer dependencies:** Designed as a secondary plugin to `typedoc-plugin-markdown` — both must be loaded in TypeDoc config.

## Configuration

In downstream projects' `typedoc.json`:

```json
{
  "plugin": [
    "typedoc-plugin-markdown",
    "typedoc-plugin-file-overview"
  ]
}
```

In `tsdoc.json`, define the custom tags so ESLint accepts them:

```json
{
  "tagDefinitions": [
    { "tagName": "@file", "syntaxKind": "block" },
    { "tagName": "@summary", "syntaxKind": "block" },
    { "tagName": "@feature", "syntaxKind": "block" },
    { "tagName": "@sideEffects", "syntaxKind": "block" }
  ]
}
```

## Testing

Tests use Vitest with Node environment. Test files are colocated as `*.test.ts`:

- `src/index.test.ts` — Unit tests for parsing and rendering logic
- `src/prompt-enhancer.test.ts` — Tests for the prompt nudge tool
- `src/install_claude_integration.test.ts` — Tests for the installer (file creation, user prompts, merging)

Run tests with `npm run test`.

## Build output

TypeScript outputs to `./dist/`:

- `dist/index.js` — Main plugin (ES2022)
- `dist/index.d.ts` — Type declarations
- `dist/prompt-enhancer.js` — Bundled prompt enhancer CLI tool
- `dist/install_claude_integration.js` — Bundled installer

Build config in `tsconfig.build.json` only includes the three entry points (index, prompt-enhancer, install_claude_integration) in the output.

## Package metadata

- **Type:** ES module (`"type": "module"`)
- **Main entry:** `./dist/index.js` (TypeDoc plugin)
- **Types:** `./dist/index.d.ts`
- **Files published:** `dist/`, `README.md`, `LICENSE`, `examples/`
- **Peer dependencies:** `typedoc` ^0.28.0, `typedoc-plugin-markdown` ^4.11.0
