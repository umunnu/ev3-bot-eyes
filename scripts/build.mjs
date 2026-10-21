import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const compiler = createRequire(import.meta.url).resolve('typescript/bin/tsc');
const scratch = new URL('../.build/', import.meta.url);
function compile(config, ...args) {
  const result = spawnSync(process.execPath, [compiler, '-p', config, ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`TypeScript build failed (${result.status})`);
}
rmSync(new URL('../dist/', import.meta.url), { recursive: true, force: true });
try {
  compile('tsconfig.build.json', '--module', 'Node16', '--moduleResolution', 'Node16', '--outDir', 'dist/esm');
  // A separate package boundary lets Node16 emit real CJS without legacy Node10 resolution.
  cpSync(new URL('../src/', import.meta.url), new URL('src/', scratch), { recursive: true });
  writeFileSync(new URL('src/package.json', scratch), '{"type":"commonjs"}\n');
  writeFileSync(new URL('tsconfig.json', scratch), JSON.stringify({
    extends: '../tsconfig.build.json', include: ['src'],
    compilerOptions: { rootDir: 'src', outDir: '../dist/cjs', sourceRoot: '../../src', module: 'Node16', moduleResolution: 'Node16' },
  }));
  compile('.build/tsconfig.json');
  mkdirSync(new URL('../dist/cjs/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
