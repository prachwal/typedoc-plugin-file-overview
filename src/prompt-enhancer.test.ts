/**
 * @file packages/typedoc-plugin-file-overview/src/prompt-enhancer.test.ts
 * Tests for the token-efficient Claude prompt enhancer.
 * @sideEffects Writes temporary files under the OS temp directory.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  FILE_HEADER_POLICY,
  buildPromptEnhancerOutput,
  extractFilePaths,
  handlePromptPayload,
} from './prompt-enhancer.ts';

function makeProject(headerByRelPath: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'prompt-enhancer-'));
  for (const [relPath, content] of Object.entries(headerByRelPath)) {
    const abs = join(root, relPath);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

const SAMPLE_HEADER = `/**
 * @file src/pages/HomePage.tsx
 * @summary Home hero with status cards.
 * @feature Routing
 * @sideEffects None
 */
export const x = 1;
`;

describe('extractFilePaths', () => {
  it('finds .ts and .tsx mentions in various quoting styles', () => {
    const prompt = 'edit `src/a.ts` and src/b.tsx and "src/c.ts"';
    const paths = extractFilePaths(prompt);
    expect(paths).toContain('src/a.ts');
    expect(paths).toContain('src/b.tsx');
    expect(paths).toContain('src/c.ts');
  });

  it('returns empty for prompts without ts/tsx paths', () => {
    expect(extractFilePaths('how does git rebase work')).toEqual([]);
  });
});

describe('buildPromptEnhancerOutput', () => {
  it('returns null when no ts/tsx paths and trivial prompt', () => {
    expect(buildPromptEnhancerOutput('how does git rebase work')).toBeNull();
  });

  it('injects compact TSDoc header summary for mentioned files', () => {
    const root = makeProject({ 'src/pages/HomePage.tsx': SAMPLE_HEADER });
    try {
      const output = buildPromptEnhancerOutput('please update src/pages/HomePage.tsx', root);
      const ctx = output?.hookSpecificOutput.additionalContext ?? '';
      expect(ctx).toContain('TSDoc headers only');
      expect(ctx).toContain('src/pages/HomePage.tsx');
      expect(ctx).toContain('Routing');
      expect(ctx).toContain('Home hero with status cards.');
      expect(ctx).toContain(FILE_HEADER_POLICY);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('falls back gracefully for files without a TSDoc header', () => {
    const root = makeProject({ 'src/raw.ts': 'export const a = 1;\n' });
    try {
      const output = buildPromptEnhancerOutput('check src/raw.ts', root);
      const ctx = output?.hookSpecificOutput.additionalContext ?? '';
      expect(ctx).toContain('src/raw.ts');
      expect(ctx).toContain('no TSDoc header');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips non-existent files but still emits policy when path mentioned', () => {
    const root = makeProject({});
    try {
      const output = buildPromptEnhancerOutput('edit src/missing.tsx', root);
      const ctx = output?.hookSpecificOutput.additionalContext ?? '';
      expect(ctx).toContain(FILE_HEADER_POLICY);
      expect(ctx).not.toContain('src/missing.tsx —');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('handlePromptPayload', () => {
  it('parses JSON and routes to enhancer', () => {
    const root = makeProject({ 'src/pages/HomePage.tsx': SAMPLE_HEADER });
    try {
      const out = handlePromptPayload(JSON.stringify({ prompt: 'edit src/pages/HomePage.tsx', cwd: root }));
      expect(out?.hookSpecificOutput.additionalContext).toContain('Routing');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns null for non-code prompts', () => {
    expect(handlePromptPayload(JSON.stringify({ prompt: 'summarize the meeting' }))).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(handlePromptPayload('not-json')).toBeNull();
  });
});
