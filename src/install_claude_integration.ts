/**
 * @file src/install_claude_integration.ts
 * Example installer for Claude Code integration files used by this package.
 * @sideEffects Writes files under a target project directory.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ClaudeSettings {
  hooks?: Record<string, unknown[]>;
  instructions?: string[];
}

export interface InstallOptions {
  force?: boolean;
  confirm?: (question: string, defaultValue: boolean) => boolean;
}

export interface InstallResult {
  settingsPath: string;
  promptEnhancerPath: string;
  instructionsPath: string;
  merged: boolean;
  created: boolean;
}

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const PROMPT_ENHANCER_SOURCE_CANDIDATES = [
  resolve(CURRENT_DIR, 'prompt-enhancer.js'),
  resolve(CURRENT_DIR, '../dist/prompt-enhancer.js'),
  resolve(CURRENT_DIR, 'prompt-enhancer.ts'),
];
const INSTRUCTIONS_SOURCE = resolve(CURRENT_DIR, '../examples/claude-file-header.instructions.md');

function resolvePromptEnhancerSource(): string {
  const source = PROMPT_ENHANCER_SOURCE_CANDIDATES.find((candidate) => existsSync(candidate));

  if (!source) {
    throw new Error('Cannot locate prompt enhancer source file.');
  }

  return source;
}

export function buildSettings(): ClaudeSettings {
  return {
    hooks: {
      UserPromptSubmit: [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: 'node $CLAUDE_PROJECT_DIR/.claude/bin/prompt-enhancer.js',
            },
          ],
        },
      ],
    },
    instructions: [
      'Every new or edited .ts / .tsx file should start with a file-level TSDoc header.',
      'Use @file, @summary, @feature, and @sideEffects in that order.',
      'Preserve an existing header and normalize it instead of creating a second one.',
    ],
  };
}

export function mergeUniqueItems<T>(existing: readonly T[], incoming: readonly T[]): T[] {
  const result = [...existing];

  for (const item of incoming) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }

  return result;
}

export function mergeSettings(existing: ClaudeSettings, incoming: ClaudeSettings): ClaudeSettings {
  const mergedHooks: Record<string, unknown[]> = { ...(existing.hooks ?? {}) };

  for (const [eventName, incomingRules] of Object.entries(incoming.hooks ?? {})) {
    const existingRules = (existing.hooks?.[eventName] ?? []) as unknown[];
    mergedHooks[eventName] = mergeUniqueItems(existingRules, incomingRules);
  }

  return {
    ...existing,
    hooks: mergedHooks,
    instructions: mergeUniqueItems(existing.instructions ?? [], incoming.instructions ?? []),
  };
}

export function installClaudeIntegration(projectRoot: string, options: InstallOptions = {}): InstallResult {
  const projectRootDir = resolve(projectRoot);
  const confirm = options.confirm ?? ((_, defaultValue) => defaultValue);
  const force = options.force ?? false;

  const claudeDir = resolve(projectRootDir, '.claude');
  const binDir = resolve(claudeDir, 'bin');
  const instructionsDir = resolve(claudeDir, 'instructions');
  const targetPrompt = resolve(binDir, 'prompt-enhancer.js');
  const targetInstructions = resolve(instructionsDir, 'file-header-policy.md');
  const targetSettings = resolve(claudeDir, 'settings.json');
  const incomingSettings = buildSettings();
  const promptEnhancerSource = resolvePromptEnhancerSource();

  mkdirSync(binDir, { recursive: true });
  mkdirSync(instructionsDir, { recursive: true });

  if (!force) {
    for (const target of [targetPrompt, targetInstructions]) {
      if (existsSync(target)) {
        throw new Error(`Refusing to overwrite existing file: ${target}`);
      }
    }
  }

  copyFileSync(promptEnhancerSource, targetPrompt);
  copyFileSync(INSTRUCTIONS_SOURCE, targetInstructions);

  let merged = false;
  let created = false;

  if (existsSync(targetSettings)) {
    const existingSettings = JSON.parse(readFileSync(targetSettings, 'utf8')) as ClaudeSettings;
    if (confirm('Merge typedoc-plugin-file-overview settings into this file?', false)) {
      const mergedSettings = mergeSettings(existingSettings, incomingSettings);
      writeFileSync(targetSettings, `${JSON.stringify(mergedSettings, null, 2)}\n`, 'utf8');
      merged = true;
    }
  } else if (confirm('Create a new .claude/settings.json with the sample configuration?', true)) {
    writeFileSync(targetSettings, `${JSON.stringify(incomingSettings, null, 2)}\n`, 'utf8');
    created = true;
  }

  return {
    settingsPath: targetSettings,
    promptEnhancerPath: targetPrompt,
    instructionsPath: targetInstructions,
    merged,
    created,
  };
}
