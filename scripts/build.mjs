import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const compiler = require.resolve('typescript/bin/tsc');
rmSync(new URL('../dist/', import.meta.url), { recursive: true, force: true });
for (const [format, resolution, folder] of [['ESNext', 'Bundler', 'esm'], ['CommonJS', 'Node', 'cjs']]) {
  const result = spawnSync(process.execPath, [compiler, '-p', 'tsconfig.build.json', '--module', format, '--moduleResolution', resolution, '--outDir', `dist/${folder}`], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
mkdirSync(new URL('../dist/cjs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
