/**
 * @file packages/typedoc-plugin-file-overview/src/index.test.ts
 * Tests for the TypeDoc file overview plugin package.
 * @sideEffects None
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  parseFileCommentMetadata,
  readFileTagMetadata,
  renderFileTagMarkdown,
} from './index.ts';

const currentDir = dirname(fileURLToPath(import.meta.url));
const fileHeaderExamplePath = join(currentDir, 'file-header-example.ts');

describe('typedoc-plugin-file-overview helpers', () => {
  it('parses structured file metadata from TSDoc lines', () => {
    const metadata = parseFileCommentMetadata([
      '@file src/pages/HomePage.tsx',
      '@summary Home page that shows the hero and stacked status cards.',
      '@feature Routing',
      '@sideEffects None',
    ]);

    expect(metadata).toEqual({
      feature: 'Routing',
      filePath: 'src/pages/HomePage.tsx',
      sideEffects: 'None',
      summary: 'Home page that shows the hero and stacked status cards.',
    });
  });

  it('renders a markdown file overview block', () => {
    const markdown = renderFileTagMarkdown({
      feature: 'Routing',
      filePath: 'src/pages/HomePage.tsx',
      sideEffects: 'None',
      summary: 'Home page that shows the hero and stacked status cards.',
    });

    expect(markdown).toContain('## File Overview');
    expect(markdown).toContain('| Path | `src/pages/HomePage.tsx` |');
    expect(markdown).toContain('| Feature | Routing |');
    expect(markdown).toContain('Home page that shows the hero and stacked status cards.');
  });

  it('reads metadata from the example source file', () => {
    const metadata = readFileTagMetadata(fileHeaderExamplePath);

    expect(metadata?.filePath).toBe('src/pages/HomePage.tsx');
    expect(metadata?.feature).toBe('Routing');
    expect(metadata?.sideEffects).toBe('None');
  });
});
