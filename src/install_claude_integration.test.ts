/**
 * @file packages/typedoc-plugin-file-overview/src/install_claude_integration.test.ts
 * Tests for the Claude installer example module.
 * @sideEffects Writes temporary files under the OS temp directory.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildSettings, installClaudeIntegration, mergeSettings, mergeUniqueItems } from './install_claude_integration.ts';

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe('Claude installer example', () => {
  it('merges unique items without duplicates', () => {
    expect(mergeUniqueItems(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('builds the default settings shape', () => {
    const settings = buildSettings();

    expect(settings.instructions).toContain('Use @file, @summary, @feature, and @sideEffects in that order.');
    expect(settings.hooks?.UserPromptSubmit?.[0]).toBeTruthy();
  });

  it('merges settings into an existing Claude file', () => {
    const merged = mergeSettings(
      { instructions: ['Existing'], hooks: { SessionStart: [{ matcher: '', hooks: [] }] } },
      buildSettings(),
    );

    expect(merged.instructions).toContain('Existing');
    expect(merged.instructions).toContain('Preserve an existing header and normalize it instead of creating a second one.');
    expect(Object.keys(merged.hooks ?? {})).toContain('SessionStart');
    expect(Object.keys(merged.hooks ?? {})).toContain('UserPromptSubmit');
  });

  it('installs the TypeScript example files into a target directory', () => {
    const targetDir = makeTempDir('typedoc-file-overview-install-');

    try {
      const claudeDir = join(targetDir, '.claude');
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(
        join(claudeDir, 'settings.json'),
        `${JSON.stringify(
          {
            hooks: {
              SessionStart: [
                {
                  hooks: [{ command: 'echo start', type: 'command' }],
                  matcher: '',
                },
              ],
            },
          },
          null,
          2,
        )}\n`,
        'utf8',
      );

      const result = installClaudeIntegration(targetDir, { confirm: () => true });

      expect(result.merged).toBe(true);
      expect(readFileSync(result.settingsPath, 'utf8')).toContain('echo start');
      expect(result.promptEnhancerPath).toContain('prompt-enhancer.js');
      expect(readFileSync(result.promptEnhancerPath, 'utf8')).toContain('buildPromptEnhancerOutput');
      expect(readFileSync(result.instructionsPath, 'utf8')).toContain('@summary');
    } finally {
      rmSync(targetDir, { force: true, recursive: true });
    }
  });

  it('creates a new settings file when one does not exist', () => {
    const targetDir = makeTempDir('typedoc-file-overview-create-');

    try {
      const result = installClaudeIntegration(targetDir, { confirm: () => true });

      expect(result.created).toBe(true);
      expect(readFileSync(result.settingsPath, 'utf8')).toContain('UserPromptSubmit');
      expect(result.promptEnhancerPath).toContain('prompt-enhancer.js');
      expect(readFileSync(result.promptEnhancerPath, 'utf8')).toContain('shouldEnhancePrompt');
    } finally {
      rmSync(targetDir, { force: true, recursive: true });
    }
  });
});
