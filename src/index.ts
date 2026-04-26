/**
 * @file packages/typedoc-plugin-file-overview/src/index.ts
 * TypeDoc plugin that renders structured file-level metadata blocks into markdown output.
 * @sideEffects Reads source files from disk and mutates TypeDoc markdown page contents.
 */

import fs from 'node:fs';
import { MarkdownPageEvent } from 'typedoc-plugin-markdown';

export interface FileMetadata {
  feature: string;
  filePath: string;
  sideEffects: string;
  summary: string;
}

type SupportedTag = '@file' | '@summary' | '@feature' | '@sideEffects';

interface PageSource {
  fullFileName?: string;
}

interface PageModel {
  sources?: PageSource[];
}

interface MarkdownPageLike {
  contents: string;
  isReflectionEvent(): boolean;
  model: PageModel;
}

interface RendererLike {
  on(event: unknown, listener: (page: MarkdownPageLike) => void): void;
}

interface PluginAppLike {
  renderer: RendererLike;
}

const fileMetadataCache = new Map<string, FileMetadata | null>();
const SUPPORTED_TAGS = ['@file', '@summary', '@feature', '@sideEffects'] as const;

function normalizeCommentLines(commentBody: string): string[] {
  return commentBody
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd());
}

function appendTagValue(
  tagValues: Partial<Record<SupportedTag, string>>,
  tagName: SupportedTag,
  value: string,
): void {
  if (!value) {
    return;
  }

  if (tagValues[tagName]) {
    tagValues[tagName] = `${tagValues[tagName]}\n${value}`;
    return;
  }

  tagValues[tagName] = value;
}

export function parseFileCommentMetadata(lines: string[]): FileMetadata | null {
  const tagValues: Partial<Record<SupportedTag, string>> = {};
  let currentTag: SupportedTag | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const nextTag = SUPPORTED_TAGS.find(
      (tag) => trimmedLine.startsWith(`${tag} `) || trimmedLine === tag,
    );

    if (nextTag) {
      currentTag = nextTag;
      appendTagValue(tagValues, currentTag, trimmedLine.slice(nextTag.length).trim());
      continue;
    }

    if (!currentTag) {
      continue;
    }

    if (trimmedLine.startsWith('@')) {
      currentTag = null;
      continue;
    }

    appendTagValue(tagValues, currentTag, trimmedLine);
  }

  if (!tagValues['@file']) {
    return null;
  }

  return {
    feature: tagValues['@feature']?.trim() || '',
    filePath: tagValues['@file'].trim(),
    sideEffects: tagValues['@sideEffects']?.trim() || '',
    summary: tagValues['@summary']?.trim() || '',
  };
}

export function readFileTagMetadata(absoluteFilePath: string): FileMetadata | null {
  if (fileMetadataCache.has(absoluteFilePath)) {
    return fileMetadataCache.get(absoluteFilePath) ?? null;
  }

  let metadata: FileMetadata | null = null;

  try {
    const source = fs.readFileSync(absoluteFilePath, 'utf8');
    const match = source.match(/^\s*\/\*\*([\s\S]*?)\*\//);

    if (match) {
      const lines = normalizeCommentLines(match[1]);
      metadata = parseFileCommentMetadata(lines);
    }
  } catch {
    metadata = null;
  }

  fileMetadataCache.set(absoluteFilePath, metadata);
  return metadata;
}

export function renderFileTagMarkdown(metadata: FileMetadata): string {
  const rows = [['Path', `\`${metadata.filePath}\``]];

  if (metadata.feature) {
    rows.push(['Feature', metadata.feature]);
  }

  if (metadata.sideEffects) {
    rows.push(['Side effects', metadata.sideEffects]);
  }

  const lines = ['## File Overview', '', '| Field | Value |', '| --- | --- |'];

  for (const [label, value] of rows) {
    lines.push(`| ${label} | ${value} |`);
  }

  if (metadata.summary) {
    lines.push('', metadata.summary);
  }

  return lines.join('\n');
}

function injectFileTag(page: MarkdownPageLike, metadata: FileMetadata): void {
  const fileTagMarkdown = renderFileTagMarkdown(metadata);

  if (page.contents.includes('\nDefined in:')) {
    page.contents = page.contents.replace(
      '\nDefined in:',
      `\n${fileTagMarkdown}\n\nDefined in:`,
    );
    return;
  }

  const titleMatch = page.contents.match(/^# .+\n/);

  if (titleMatch) {
    page.contents = page.contents.replace(titleMatch[0], `${titleMatch[0]}\n${fileTagMarkdown}\n\n`);
    return;
  }

  page.contents = `${fileTagMarkdown}\n\n${page.contents}`;
}

export function load(app: PluginAppLike): void {
  app.renderer.on(MarkdownPageEvent.END, (page) => {
    if (!page.isReflectionEvent()) {
      return;
    }

    const source = page.model.sources?.[0];

    if (!source?.fullFileName) {
      return;
    }

    const metadata = readFileTagMetadata(source.fullFileName);

    if (!metadata?.filePath) {
      return;
    }

    injectFileTag(page, metadata);
  });
}
