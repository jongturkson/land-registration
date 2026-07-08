/**
 * Copies non-TypeScript runtime assets into dist/ after tsc compiles.
 * The Casbin middleware resolves model.conf and policy.csv relative to the
 * compiled file (__dirname), so they must exist inside dist/config.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'config');
const outDir = path.join(__dirname, '..', 'dist', 'config');

fs.mkdirSync(outDir, { recursive: true });

for (const file of ['model.conf', 'policy.csv']) {
  fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
  console.log(`copied src/config/${file} -> dist/config/${file}`);
}
