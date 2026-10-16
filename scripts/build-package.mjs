import { cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
rmSync(new URL('dist/', root), { recursive: true, force: true });
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--project', 'tsconfig.build.json'], {
  cwd: fileURLToPath(root),
  stdio: 'inherit',
});
// Reference validators resolve frozen schemas relative to their compiled modules.
cpSync(new URL('docs/contracts/', root), new URL('dist/docs/contracts/', root), { recursive: true });
