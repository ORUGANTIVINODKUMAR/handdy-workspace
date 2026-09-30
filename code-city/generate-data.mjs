import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const output = path.join(here, 'code-data.js');
const codeExtensions = new Set(['.js', '.jsx', '.css', '.cjs', '.mjs', '.html']);
const ignoredDirectories = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', 'code-city', 'ui-review',
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || ignoredDirectories.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath));
    else if (codeExtensions.has(path.extname(entry.name).toLowerCase())) files.push(absolutePath);
  }

  return files;
}

const paths = (await walk(root)).sort((a, b) => a.localeCompare(b));
const files = [];

for (const absolutePath of paths) {
  const source = await readFile(absolutePath, 'utf8');
  const lines = source.length === 0 ? [] : source.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
  const segments = relativePath.split('/');
  files.push({
    path: relativePath,
    name: segments.at(-1),
    district: segments.length > 1 ? segments[0] : 'root',
    extension: path.extname(relativePath).slice(1).toLowerCase(),
    lines: lines.length,
    nonblank: lines.filter((line) => line.trim()).length,
    source,
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  repository: path.basename(root),
  files,
};

await writeFile(output, `window.CODE_CITY_DATA = ${JSON.stringify(payload)};\n`);
console.log(`Generated ${path.relative(root, output)} with ${files.length} buildings.`);
