// Node loader hook: lets a plain `node` script import src/lib/*.ts modules that
// read `import.meta.env` (Astro's build maps those to process.env for secrets;
// outside Astro, `import.meta.env` is undefined and the import would throw).
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (!url.includes('/src/') || result.source == null) return result;
  const source = String(result.source).replace(/\bimport\.meta\.env\b/g, 'process.env');
  return { ...result, source };
}
