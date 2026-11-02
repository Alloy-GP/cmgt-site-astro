// Node loader hook: lets a plain `node` script import src/**/*.ts modules that
// read `import.meta.env` (Astro's build maps those to process.env for secrets;
// outside Astro, `import.meta.env` is undefined and the import would throw).
//
// It also resolves Astro's `~/` alias (tsconfig paths → ./src), so a script can
// import a route handler such as src/pages/api/lead.ts, whose imports use it.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../../src/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('~/')) {
    const base = new URL(specifier.slice(2), SRC);
    for (const suffix of ['', '.ts', '.js', '.mjs', '/index.ts', '/index.js']) {
      const candidate = new URL(base.href + suffix);
      if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
    }
    throw new Error(`[loader] cannot resolve ${specifier} under src/`);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (!url.includes('/src/') || result.source == null) return result;
  const source = String(result.source).replace(/\bimport\.meta\.env\b/g, 'process.env');
  return { ...result, source };
}
