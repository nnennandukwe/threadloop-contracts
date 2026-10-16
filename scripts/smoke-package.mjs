import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const npmEntry = process.env.npm_execpath;
if (!npmEntry) throw new Error('Run this check with npm run smoke:pack.');
const temporary = mkdtempSync(path.join(tmpdir(), 'threadloop-contracts-package-'));
const run = (program, args, cwd, input) =>
  execFileSync(program, args, {
    cwd,
    input,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000,
  });
function assetDigests(directory, prefix = '') {
  const digests = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(digests, assetDigests(path.join(directory, entry.name), relative + '/'));
    else
      digests[relative] = createHash('sha256')
        .update(readFileSync(path.join(directory, entry.name)))
        .digest('hex');
  }
  return digests;
}
try {
  const packed = JSON.parse(
    run(process.execPath, [npmEntry, 'pack', '--ignore-scripts', '--json', '--pack-destination', temporary], root),
  );
  const tarball = path.join(temporary, packed[0].filename);
  writeFileSync(path.join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run(
    process.execPath,
    [npmEntry, 'install', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund', tarball],
    temporary,
  );
  const probe = `
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { workflow, controller, execution, executor } from 'threadloop-contracts';
const digests = JSON.parse(readFileSync(0, 'utf8'));
for (const [name, digest] of Object.entries(digests)) {
  const bytes = readFileSync(new URL(import.meta.resolve('threadloop-contracts/assets/' + name)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, name);
}
const request = JSON.parse(readFileSync(new URL(import.meta.resolve('threadloop-contracts/assets/executor-v0.1/fixtures/executor-request.canonical')), 'utf8'));
assert.equal(executor.validateExecutorRequest(request).ok, true);
assert.equal(typeof workflow.compileWorkflowProfile, 'function');
assert.equal(typeof controller.validateControllerDecision, 'function');
assert.equal(typeof execution.replayExecutionJournal, 'function');
assert.match(execution.executionAdmissionDigest({kind:'projection',execution_digest:'a'.repeat(64),snapshot:{}}), /^[a-f0-9]{64}$/);
assert.equal(executor.canonicalExecutorJson({b:2,a:1}).value, '{"a":1,"b":2}');
`;
  run(
    process.execPath,
    ['--input-type=module', '-e', probe],
    temporary,
    JSON.stringify(assetDigests(path.join(root, 'docs/contracts'))),
  );
  const consumer = path.join(temporary, 'consumer.ts');
  writeFileSync(
    consumer,
    `import { validateExecutorRequest, type ExecutorRequest } from 'threadloop-contracts/executor';
export function validate(value: unknown): ExecutorRequest | null {
  const result = validateExecutorRequest(value);
  return result.ok ? result.value : null;
}
`,
  );
  run(
    process.execPath,
    [
      require.resolve('typescript/bin/tsc'),
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      '--module',
      'NodeNext',
      '--target',
      'ES2022',
      consumer,
    ],
    temporary,
  );
  console.log('Packed reference validators, declarations and frozen assets work outside the checkout.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
