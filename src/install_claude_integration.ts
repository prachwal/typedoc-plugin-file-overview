/**
 * @file src/install_claude_integration.ts
 * Example installer for Claude Code integration files used by this package.
 * @sideEffects Writes files under a target project directory.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prompt from 'prompts';

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

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text: string, color: string): string {
  return `${color}${text}${COLORS.reset}`;
}

function printSection(title: string): void {
  console.log(`\n${colorize(title, COLORS.bold + COLORS.blue)}`);
}

function printSuccess(message: string): void {
  console.log(`${colorize('✓', COLORS.green)} ${message}`);
}

function printInfo(message: string): void {
  console.log(`${colorize('ℹ', COLORS.blue)} ${message}`);
}

function printWarning(message: string): void {
  console.log(`${colorize('⚠', COLORS.yellow)} ${message}`);
}

function readBooleanAnswer(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export interface InstallationStatus {
  isInstalled: boolean;
  hasPromptEnhancer: boolean;
  hasInstructions: boolean;
  hasSettings: boolean;
  settingsPath?: string;
  promptEnhancerPath?: string;
  instructionsPath?: string;
}

export function checkInstallationStatus(projectRoot: string): InstallationStatus {
  const claudeDir = resolve(projectRoot, '.claude');
  const promptEnhancerPath = resolve(claudeDir, 'bin/prompt-enhancer.js');
  const instructionsPath = resolve(claudeDir, 'instructions/file-header-policy.md');
  const settingsPath = resolve(claudeDir, 'settings.json');

  const hasPromptEnhancer = existsSync(promptEnhancerPath);
  const hasInstructions = existsSync(instructionsPath);
  const hasSettings = existsSync(settingsPath);

  return {
    isInstalled: hasPromptEnhancer && hasInstructions,
    hasPromptEnhancer,
    hasInstructions,
    hasSettings,
    settingsPath: hasSettings ? settingsPath : undefined,
    promptEnhancerPath: hasPromptEnhancer ? promptEnhancerPath : undefined,
    instructionsPath: hasInstructions ? instructionsPath : undefined,
  };
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
    const existingRules = (existing.hooks?.[eventName] ?? []);
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

export async function installClaudeIntegrationInteractive(projectRoot?: string): Promise<InstallResult> {
  printSection('📦 typedoc-plugin-file-overview Installer');

  const targetDir = projectRoot ?? process.cwd();
  if (!projectRoot) {
    printInfo(`Using current directory: ${targetDir}`);
  }

  const settingsPath = resolve(targetDir, '.claude/settings.json');
  const existingSettings = existsSync(settingsPath);

  if (existingSettings) {
    printWarning('Found existing .claude/settings.json');
  }

  printSection('📋 Installation Steps');
  printInfo('1. Copy prompt-enhancer script to .claude/bin/');
  printInfo('2. Copy file-header instructions to .claude/instructions/');
  if (existingSettings) {
    printInfo('3. Merge settings into .claude/settings.json');
  } else {
    printInfo('3. Create .claude/settings.json');
  }

  const questions = existingSettings
    ? [
        {
          type: 'confirm' as const,
          name: 'merge',
          message: 'Merge typedoc-plugin-file-overview settings?',
          initial: false,
        },
      ]
    : [
        {
          type: 'confirm' as const,
          name: 'create',
          message: 'Create .claude/settings.json with sample configuration?',
          initial: true,
        },
      ];

  const response = (await prompt(questions));

  if (Object.keys(response).length === 0) {
    printWarning('Installation cancelled by user');
    process.exit(0);
  }

  printSection('⚙️ Installing...');

  const result = installClaudeIntegration(targetDir, {
    confirm: (question: string) => {
      if (question.includes('Merge')) {
        return readBooleanAnswer(response.merge, false);
      }
      return readBooleanAnswer(response.create, true);
    },
  });

  printSection('✨ Installation Complete');
  printSuccess(`Prompt enhancer: ${result.promptEnhancerPath}`);
  printSuccess(`Instructions: ${result.instructionsPath}`);
  printSuccess(result.merged ? 'Settings merged' : result.created ? 'Settings created' : 'Settings not modified');

  console.log(`\n${colorize('Next steps:', COLORS.bold)}`);
  console.log(`• Restart your Claude Code session`);
  console.log(`• New .ts/.tsx files will auto-enhance with file-header suggestions`);
  console.log(`• Edit ${result.instructionsPath} to customize the file header policy\n`);

  return result;
}
