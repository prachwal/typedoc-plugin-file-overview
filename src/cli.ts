#!/usr/bin/env node
/**
 * @file src/cli.ts
 * @summary Interactive CLI for installing typedoc-plugin-file-overview integration.
 * @sideEffects Writes files to target project directory.
 */

import { checkInstallationStatus, installClaudeIntegrationInteractive } from './install_claude_integration.js';

const projectRoot = process.argv[2];
const command = process.argv[2]?.toLowerCase();

// If only asking for status, don't start installation
if (command === 'status' || command === '--status' || command === '-s') {
  const status = checkInstallationStatus(process.cwd());
  console.log('\n📋 Installation Status:\n');
  console.log(`  Prompt enhancer:  ${status.hasPromptEnhancer ? '✓' : '✗'}`);
  console.log(`  Instructions:     ${status.hasInstructions ? '✓' : '✗'}`);
  console.log(`  Settings:         ${status.hasSettings ? '✓' : '✗'}`);
  console.log(`  Overall:          ${status.isInstalled ? '✓ Installed' : '✗ Not installed'}\n`);
  process.exit(0);
}

installClaudeIntegrationInteractive(projectRoot).catch((error: Error) => {
  console.error(`\n❌ Installation failed: ${error.message}`);
  process.exit(1);
});
