/**
 * @file packages/typedoc-plugin-file-overview/src/prompt-enhancer.test.ts
 * Tests for the Claude prompt enhancer example module.
 * @sideEffects None
 */

import { describe, expect, it } from 'vitest';

import {
  FILE_HEADER_POLICY,
  buildPromptEnhancerOutput,
  handlePromptPayload,
  shouldEnhancePrompt,
} from './prompt-enhancer.ts';

describe('prompt enhancer sample', () => {
  it('detects code-related prompts', () => {
    expect(shouldEnhancePrompt('Update src/pages/HomePage.tsx')).toBe(true);
    expect(shouldEnhancePrompt('Summarize the meeting')).toBe(false);
  });

  it('builds additional context for code prompts', () => {
    const output = buildPromptEnhancerOutput('Update src/pages/HomePage.tsx to add docs header');

    expect(output?.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
    expect(output?.hookSpecificOutput.additionalContext).toContain(FILE_HEADER_POLICY);
  });

  it('parses JSON payloads and ignores invalid input', () => {
    expect(handlePromptPayload(JSON.stringify({ prompt: 'Update src/pages/HomePage.tsx' }))).toBeTruthy();
    expect(handlePromptPayload(JSON.stringify({ prompt: 'Summarize the meeting' }))).toBeNull();
    expect(handlePromptPayload('not-json')).toBeNull();
  });
});
