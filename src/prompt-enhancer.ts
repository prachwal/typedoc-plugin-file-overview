/**
 * @file src/prompt-enhancer.ts
 * Example Claude prompt enhancer that adds file-header guidance for code tasks.
 * @sideEffects Reads JSON input from the caller and returns a JSON payload.
 */

export interface PromptPayload {
  prompt?: string;
}

export interface PromptEnhancerOutput {
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit';
    additionalContext: string;
  };
}

export const FILE_HEADER_POLICY = [
  '[File header policy] Keep this TSDoc block at the top of every new or edited `.ts` / `.tsx` file:',
  '/**',
  ' * @file relative/path/to/file.ts',
  ' * @summary One sentence describing the module purpose.',
  ' * @feature Feature area or subsystem.',
  ' * @sideEffects None',
  ' */',
  'Preserve an existing header and normalize it instead of creating a second one.',
].join('\n');

export const CODE_SIGNALS = [
  '.ts',
  '.tsx',
  'typescript',
  'tsdoc',
  'typedoc',
  'component',
  'hook',
  'service',
  'slice',
  'api',
  'file',
  'plik',
] as const;

export function shouldEnhancePrompt(prompt: string): boolean {
  const lowered = prompt.toLowerCase();
  return CODE_SIGNALS.some((signal) => lowered.includes(signal));
}

export function buildPromptEnhancerOutput(prompt: string): PromptEnhancerOutput | null {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt || !shouldEnhancePrompt(trimmedPrompt)) {
    return null;
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: FILE_HEADER_POLICY,
    },
  };
}

export function handlePromptPayload(raw: string): PromptEnhancerOutput | null {
  try {
    const payload = raw.trim() ? (JSON.parse(raw) as PromptPayload) : {};
    return buildPromptEnhancerOutput(String(payload.prompt ?? ''));
  } catch {
    return null;
  }
}
