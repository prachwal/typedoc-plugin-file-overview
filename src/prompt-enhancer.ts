/**
 * @file src/prompt-enhancer.ts
 * Token-efficient Claude prompt enhancer: injects compact TSDoc headers for .ts/.tsx files mentioned in the prompt instead of full file bodies.
 * @sideEffects Reads files referenced in the prompt to extract their TSDoc headers.
 */

import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

import { readFileTagMetadata, type FileMetadata } from './index.js';

export interface PromptPayload {
  prompt?: string;
  cwd?: string;
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
  'Full file content is available on demand via the Read tool — prefer this compact header summary first.',
].join('\n');

const FILE_PATH_REGEX = /(?:^|[\s`'"(\[])((?:\.{0,2}\/)?(?:[\w.@-]+\/)*[\w.-]+\.tsx?)(?=[\s`'"):,.\]]|$)/gm;

export function extractFilePaths(prompt: string): string[] {
  const found = new Set<string>();
  for (const match of prompt.matchAll(FILE_PATH_REGEX)) {
    found.add(match[1]);
  }
  return [...found];
}

export function resolveFilePath(candidate: string, projectRoot: string): string | null {
  const absolute = isAbsolute(candidate) ? candidate : resolve(projectRoot, candidate);
  return existsSync(absolute) ? absolute : null;
}

export function formatHeaderLine(metadata: FileMetadata): string {
  const parts = [metadata.filePath];
  if (metadata.feature) parts.push(metadata.feature);
  if (metadata.summary) parts.push(metadata.summary);
  const main = parts.join(' — ');
  return metadata.sideEffects ? `- ${main} (side: ${metadata.sideEffects})` : `- ${main}`;
}

export function loadHeaderSummaries(paths: readonly string[], projectRoot: string): string[] {
  const lines: string[] = [];
  for (const candidate of paths) {
    const absolute = resolveFilePath(candidate, projectRoot);
    if (!absolute) continue;
    const metadata = readFileTagMetadata(absolute);
    if (!metadata) {
      lines.push(`- ${candidate} (no TSDoc header — read full file if needed)`);
      continue;
    }
    lines.push(formatHeaderLine(metadata));
  }
  return lines;
}

export function buildPromptEnhancerOutput(
  prompt: string,
  projectRoot: string = process.cwd(),
): PromptEnhancerOutput | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;

  const paths = extractFilePaths(trimmed);
  const summaries = paths.length ? loadHeaderSummaries(paths, projectRoot) : [];

  if (summaries.length === 0 && paths.length === 0) {
    return null;
  }

  const sections: string[] = [];
  if (summaries.length > 0) {
    sections.push('[File context — TSDoc headers only; use Read tool for full content]');
    sections.push(...summaries);
    sections.push('');
  }
  sections.push(FILE_HEADER_POLICY);

  return {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: sections.join('\n'),
    },
  };
}

export function handlePromptPayload(raw: string): PromptEnhancerOutput | null {
  try {
    const payload = raw.trim() ? (JSON.parse(raw) as PromptPayload) : {};
    return buildPromptEnhancerOutput(String(payload.prompt ?? ''), payload.cwd ?? process.cwd());
  } catch {
    return null;
  }
}
