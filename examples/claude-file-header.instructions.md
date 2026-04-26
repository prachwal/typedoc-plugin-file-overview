# File Header Policy

When editing or creating a `.ts` or `.tsx` file, keep a file-level TSDoc block at the top of the module.

Use this format:

```ts
/**
 * @file relative/path/to/file.ts
 * @summary One sentence describing the module purpose.
 * @feature Feature area or subsystem.
 * @sideEffects None
 */
```

Rules:

- keep `@file` as the first line inside the block
- keep the path relative to the project root
- keep `@summary` short and focused on purpose, not implementation
- keep `@feature` short, usually one subsystem or feature area
- set `@sideEffects` to `None` when there are no effects, otherwise name the effect clearly
- if a file already has a header, normalize it instead of adding a second one

When updating an existing file, preserve the current intent of the header and only correct the format when needed.
