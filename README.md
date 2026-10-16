# ThreadLoop Contracts

Versioned specifications for [ThreadLoop](https://github.com/nnennandukwe/threadloop)'s Controller Contract, and the
reference TypeScript validators that check them. Each contract family has JSON Schemas, valid and invalid fixtures, and
a normative README under `docs/contracts/`.

ThreadLoop's current runtime implements a fixed governed PR lifecycle. It doesn't yet import this repository. These
contracts specify the next stage: configurable workflow graphs, a deterministic controller, crash-safe execution claims,
and the executor seam to [GAAP](https://github.com/nnennandukwe/governed-agent-autonomy-patterns). The conformance
corpus is what an implementation, including the planned Rust ThreadLoop, must pass.

## Contract families (v0.1, frozen)

| Family                               | Specification                                                                                        | Reference code                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------- |
| Workflow Profile / Compiled Graph    | [`docs/contracts/workflow-graph-v0.1`](docs/contracts/workflow-graph-v0.1/README.md)                 | `scripts/workflow-graph`         |
| Controller Decision / Action Request | [`docs/contracts/controller-v0.1`](docs/contracts/controller-v0.1/README.md)                         | `scripts/controller-contract`    |
| Execution Claim / Attempt            | [`docs/contracts/execution-v0.1`](docs/contracts/execution-v0.1/README.md)                           | `scripts/execution-contract`     |
| Executor interface / GAAP mapping    | [`docs/contracts/executor-v0.1`](docs/contracts/executor-v0.1/README.md)                             | `scripts/executor-contract`      |
| Controller Conformance Protocol      | [`docs/contracts/controller-conformance-v0.1`](docs/contracts/controller-conformance-v0.1/README.md) | `scripts/controller-conformance` |

`scripts/contract-kernel` holds what every family shares: diagnostics, shape validation, digests, and schema publishing.
`src/` has the canonical JSON and SHA-256 helpers those digests use.

## Commands

Requires Node.js 22.22.2+ within Node 22, 24.15.0+ within Node 24, or Node 26+.

```bash
npm ci
npm run check                  # format, lint, types, conformance, tests, build, packed install
npm run spec:conformance:check # validate the controller conformance corpus on its own
npm run spec:controller:schemas # regenerate one family's published schemas (also: workflow-graph, execution, executor, conformance)
```

CI regenerates every family's schemas and fails if `docs/contracts/` changes. The published bytes are the contract, so a
schema change has to be deliberate and versioned.

## Reference validator package

`npm run build` emits ESM modules, TypeScript declarations and byte-identical frozen contract assets into `dist/`.
`npm ci` builds them through `prepare`. `npm run smoke:pack` installs a tarball into a temporary directory outside this
checkout, imports the validators, typechecks a consumer and compares every packaged asset's SHA-256 with its source.

The package stays private: it isn't published to an npm registry. Consumers can pin this repository to a full Git commit
that includes the package API. npm builds Git dependencies during preparation, so the install host needs the Node/npm
prerequisites above. Keep the resolved Git revision and dependency lockfile under version control.

```ts
import { validateExecutorRequest, type ExecutorRequest } from 'threadloop-contracts/executor';

export function parseRequest(value: unknown): ExecutorRequest | null {
  const result = validateExecutorRequest(value);
  return result.ok ? result.value : null;
}
```

The root module exports `workflow`, `controller`, `execution` and `executor` namespaces. The same names are available as
subpaths for direct imports. Frozen assets resolve through `threadloop-contracts/assets/`, for example:

```js
const fixture = import.meta.resolve('threadloop-contracts/assets/executor-v0.1/fixtures/executor-request.canonical');
```

These are the existing reference validators and execution model. Importing them doesn't implement durable storage,
process supervision or the GAAP bridge tracked in
[ThreadLoop #111](https://github.com/nnennandukwe/threadloop/issues/111). The v0.1 contract bytes and canonical digest
rules stay unchanged.

The executor mapper follows the frozen ThreadLoop mapping, including its documented
[completion-effect compatibility limit](docs/contracts/executor-v0.1/README.md#results-and-one-shot-authority-handling).
It also requires ledger approvals to bind the subject current at their event. It's not a replacement for the live GAAP
producer's full semantic validation or an independent signed-evidence consumer.

## Consumers

- **RunInvariant** pins the controller conformance corpus by commit. Its ThreadLoop harness reads
  `docs/contracts/controller-conformance-v0.1`.
- **ThreadLoop** keeps a vendored copy of the v0.1 Governed PR profile to catch drift between its runtime lifecycle and
  this contract.

## History

This repository was extracted from ThreadLoop at
[`15dd6f9`](https://github.com/nnennandukwe/threadloop/commit/15dd6f9ff2952b53b9ab3a7e04455942e78d6ef8), with the full
history of these paths preserved. Issue and pull request references in older commit messages point to
`nnennandukwe/threadloop`.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
