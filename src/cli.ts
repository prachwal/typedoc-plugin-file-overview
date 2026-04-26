#!/usr/bin/env node
/**
 * @file src/cli.ts
 * @summary Interactive CLI for installing typedoc-plugin-file-overview integration.
 * @sideEffects Writes files to target project directory.
 */

import { checkInstallationStatus, installClaudeIntegrationInteractive } from './install_claude_integration.js';

const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();
const hasForceFlag = args.includes('--force') || args.includes('-f');

// Status command
if (command === 'status' || command === '--status' || command === '-s') {
  const status = checkInstallationStatus(process.cwd());
  console.log('\n📋 Installation Status:\n');
  console.log(`  Prompt enhancer:  ${status.hasPromptEnhancer ? '✓' : '✗'}`);
  console.log(`  Instructions:     ${status.hasInstructions ? '✓' : '✗'}`);
  console.log(`  Settings:         ${status.hasSettings ? '✓' : '✗'}`);
  console.log(`  Overall:          ${status.isInstalled ? '✓ Installed' : '✗ Not installed'}\n`);
  process.exit(0);
}

// Help command
if (command === 'help' || command === '--help' || command === '-h') {
  console.log(`
📦 typedoc-plugin-file-overview Installer

Usage:
  npx typedoc-plugin-file-overview-install [project-dir] [options]
  npx typedoc-plugin-file-overview-install status

Options:
  --force, -f          Overwrite existing prompt-enhancer and instructions
  --help, -h           Show this message

Examples:
  # Interactive install in current directory
  npx typedoc-plugin-file-overview-install

  # Install in specific directory
  npx typedoc-plugin-file-overview-install /path/to/project

  # Reinstall (force overwrite)
  npx typedoc-plugin-file-overview-install --force

  # Check current status
  npx typedoc-plugin-file-overview-install status
`);
  process.exit(0);
}

const projectRoot = args[0];

installClaudeIntegrationInteractive(projectRoot, { force: hasForceFlag }).catch((error: Error) => {
  console.error(`\n❌ Installation failed: ${error.message}`);
  process.exit(1);
});
