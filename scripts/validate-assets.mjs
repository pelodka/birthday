import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const publicRoot = path.join(repoRoot, 'public');

const scanRoots = ['src', 'scripts', 'electron', 'docs'];
const scanFiles = ['README.md', 'index.html', 'package.json'];
const sourceExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx']);
const assetPattern =
  /(?:['"`(=:\s]|url\(\s*['"]?)(\/[^'"`)<>\s?#$]+\.(?:avif|gif|glb|gltf|ico|jpeg|jpg|json|mp3|mp4|ogg|otf|png|svg|ttf|wav|webm|webp|woff|woff2))(?:[?#][^'"`)<>\s]*)?/giu;

const missing = [];
const checked = new Set();

for (const root of scanRoots) {
  await scanPath(path.join(repoRoot, root));
}

for (const file of scanFiles) {
  await scanFile(path.join(repoRoot, file));
}

if (missing.length > 0) {
  process.stderr.write('Missing public asset references:\n');
  missing.forEach((entry) => {
    process.stderr.write(`- ${entry.source}:${entry.line} -> ${entry.asset}\n`);
  });
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${checked.size} public asset reference${checked.size === 1 ? '' : 's'}.\n`);
}

async function scanPath(targetPath) {
  if (!existsSync(targetPath)) {
    return;
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'release') {
          return;
        }
        await scanPath(entryPath);
        return;
      }

      if (entry.isFile()) {
        await scanFile(entryPath);
      }
    }),
  );
}

async function scanFile(filePath) {
  if (!sourceExtensions.has(path.extname(filePath))) {
    return;
  }

  const source = await readFile(filePath, 'utf8');
  const relativeSource = path.relative(repoRoot, filePath);
  for (const match of source.matchAll(assetPattern)) {
    const asset = match[1];
    if (!asset || asset.includes('${')) {
      continue;
    }

    checked.add(asset);
    const publicPath = path.join(publicRoot, decodeURIComponent(asset.slice(1)));
    if (existsSync(publicPath)) {
      continue;
    }

    missing.push({
      asset,
      line: getLineNumber(source, match.index ?? 0),
      source: relativeSource,
    });
  }
}

function getLineNumber(source, index) {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (source.charCodeAt(position) === 10) {
      line += 1;
    }
  }
  return line;
}
