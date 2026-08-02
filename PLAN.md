# Plan: Expand the Agnes catalog and fix AdRouter thinking defaults

## Goal

Add `agnes-2.0-flash` and `agnes-2.5-pro` to the generated AdRouterCLI catalog and make absent
reasoning map to the Router-supported default for Agnes models without changing DeepSeek, MiMo,
other providers, or custom model behavior.

## Context

- Staging Router readiness and `GET /v1/models` were rechecked on 2026-08-02.
- Staging exposes eight configured models with 131,072 total, 126,976 input, and 4,096 output
  tokens.
- Agnes 2.0/2.5 Flash support `none` and `high`, defaulting to `none`.
- Agnes 2.5 Pro and Pro Alpha support only `high`, defaulting to `high`.
- The agent runtime intentionally represents thinking off as `reasoning: undefined`; the current
  AdRouter transport incorrectly maps every absent value to `medium`.
- The checkout began clean at `3de0cf70e3ac5a2c70b94e97e472a1cda549b254`, one commit ahead of
  `origin/main`.

## Research Summary

- `packages/ai/scripts/generate-models.ts` is the authoritative static AdRouter catalog source.
- `packages/ai/src/providers/adrouter.models.ts` is generated; the aggregate generated module only
  imports provider catalogs and may remain byte-identical.
- CLI model selection clamps unsupported thinking levels before the transport. The AdRouter request
  mapper still needs model-aware defaults for the runtime's absent-reasoning representation.
- Installed-runtime and documentation checks keep independent exact-catalog lists that must remain
  synchronized.
- No new dependency, persisted-state migration, public TypeScript API, or Router schema is needed.

## Constraints

- Preserve existing user-facing behavior except for the requested Agnes catalog and thinking fix.
- Keep the implementation small, reviewable, reversible, and provider-scoped.
- Preserve DeepSeek mappings and its absent-value `medium` fallback.
- Preserve MiMo mappings and its existing absent-value `medium` fallback.
- Preserve official installation proof, custom/loopback bearer separation, workspace trust,
  approvals, bounded streaming, and sponsor isolation.
- Generate provider catalogs through the checked-in generator; never hand-edit generated files.
- Use Node.js 22.19 or newer and the checked-in npm lockfile.
- Do not introduce dependencies or change versions, tags, npm dist-tags, GitHub releases, remote
  secrets, or deployed services.

## Out of Scope

- Router, WebUI, Desktop Agent, OpenCode, infrastructure, database, or deployment changes.
- npm publication, Git tagging, GitHub release operations, or release metadata changes.
- Global reasoning semantics, configuration formats, `settings.json`, or `models.json`.
- Unrelated cleanup, refactors, or documentation rewrites.

## Reversibility

- Keep transport, generated catalog, tests, and documentation changes separable in the diff.
- Add model IDs and narrow fallbacks without removing existing models or interfaces.
- Retain existing generic mapping behavior for every non-Agnes model.
- A normal source revert restores the six-model catalog; there are no data migrations or external
  mutations to undo.

---

## Step A: Implement the AdRouter transport and generated catalog

### Status

`done`

### Objective

Make the request wire format follow the finalized Agnes descriptors and expose the exact eight-model
hosted catalog.

### Tasks

- [x] Recheck staging readiness and the public model descriptors.
- [x] Resolve the outgoing Router model ID once and use it for both the request and thinking mapper.
- [x] Map absent reasoning to `none` for Agnes Flash and `high` for Agnes Pro variants.
- [x] Preserve the existing fallback and explicit mappings for every other model.
- [x] Add both new models to the generator and regenerate the AdRouter provider catalog.

### Relevant Files

- `packages/ai/src/api/adrouter.ts`
- `packages/ai/scripts/generate-models.ts`
- `packages/ai/src/providers/adrouter.models.ts`

### Expected Changes

- modify: AdRouter request mapping and generated eight-model catalog

### Do Not Modify

- `packages/agent/src/agent-loop.ts` runtime semantics
- `packages/ai/src/models.generated.ts` by hand
- Other provider catalogs or global reasoning helpers

### Commands

```bash
ADROUTER_MODEL_CATALOG_PROVIDER=adrouter npm --prefix packages/ai run generate-models
```

### Acceptance Criteria

- [x] The generated catalog contains the exact eight model IDs and finalized thinking maps.
- [x] Agnes Flash absent reasoning serializes as `none`.
- [x] Agnes Pro absent reasoning serializes as `high`.
- [x] DeepSeek, MiMo, unknown, and custom model fallback behavior is unchanged.
- [x] Only the scoped generated provider catalog changes.

### Validation Results

- Staging `/health/ready`: passed on 2026-08-02.
- Staging `/v1/models`: passed exact eight-model descriptor check on 2026-08-02.
- Scoped model generation: passed on 2026-08-02; unrelated live provider fetches were unavailable,
  and scoped generation left other catalogs plus `src/models.generated.ts` unchanged.

### Findings / Notes

- The mapping must follow `ADROUTER_MODEL_ROUTE` when that override selects the outgoing model.

---

## Step B: Add regression and catalog coverage

### Status

`done`

### Objective

Lock the actual request-body behavior and prove the agent's off-to-undefined convention remains
provider-owned.

### Tasks

- [x] Expand exact ID, name, limits, and thinking-map assertions to eight models.
- [x] Inspect serialized request bodies for every supported thinking mode.
- [x] Cover absent reasoning for Agnes Flash/Pro, DeepSeek, and MiMo explicitly.
- [x] Cover routed-model override behavior.
- [x] Add an agent-loop regression showing off still becomes `reasoning: undefined` on a next turn.

### Relevant Files

- `packages/ai/test/adrouter.test.ts`
- `packages/agent/test/agent-loop.test.ts`

### Expected Changes

- modify: focused AI transport/catalog tests and agent-loop regression coverage

### Do Not Modify

- Global agent reasoning behavior
- Tests for unrelated providers

### Commands

```bash
npm test --workspace @adrouter/ai -- adrouter.test.ts
npm test --workspace @adrouter/agent-core -- agent-loop.test.ts
```

### Acceptance Criteria

- [x] Request tests inspect the actual `thinking_level` JSON field.
- [x] Agnes 2.0/2.5 Flash cover absent/off and high.
- [x] Agnes 2.5 Pro/Pro Alpha cover absent/high and high-only clamping.
- [x] DeepSeek absent/off/medium/high behavior is unchanged.
- [x] MiMo absent/off/high behavior is explicitly unchanged.
- [x] Focused AI and agent tests pass.

### Validation Results

- Focused AI tests: passed 1 file and 26 tests on 2026-08-02.
- Focused agent tests: passed 1 file and 20 tests on 2026-08-02.

### Findings / Notes

- MiMo's absent-value `medium` behavior is intentionally retained as a compatibility constraint even
  though its advertised modes remain off/high.

---

## Step C: Synchronize exact-catalog checks and documentation

### Status

`done`

### Objective

Keep source, installed-package verification, offline listing, repository instructions, and
user-facing documentation on the same eight-model contract.

### Tasks

- [x] Update installed-runtime and documentation exact-catalog assertions.
- [x] Add the package README to enforced catalog documentation checks.
- [x] Update every active hosted-model list in instructions, README/docs, and the bundled CLI skill.
- [x] Add unreleased AI and coding-agent changelog entries.
- [x] Confirm stale six-model or two-model product claims no longer remain outside historical notes.

### Relevant Files

- `scripts/verify-installed-runtime.mjs`
- `scripts/check-docs.mjs`
- Active Markdown documentation and bundled AdRouterCLI skill documentation

### Expected Changes

- modify: exact-catalog verification, active model documentation, and unreleased changelogs

### Do Not Modify

- Historical changelog entries
- Package versions, release manifest, lockfile, or workflows

### Commands

```bash
npm run check:docs
rg -n "six models|six-model|exact six|only two DeepSeek" .
```

### Acceptance Criteria

- [x] All enforced documents contain both new model IDs.
- [x] Installed/offline verification expects the exact ordered eight-model list.
- [x] Active documentation describes the correct thinking capabilities and token limits.
- [x] Historical release notes remain historically accurate.
- [x] Documentation checks pass.

### Validation Results

- Documentation check: passed across 97 Markdown files on 2026-08-02.
- Stale active-claim search: passed on 2026-08-02; prior six-model changelog text remains historical.

### Findings / Notes

- Changelog statements about the prior six-model beta are historical and should not be rewritten.

---

## Step D: Final verification and cleanup

### Status

`done`

### Objective

Validate the source and production-faithful package before publishing or deploying anything.

### Tasks

- [x] Run focused tests, build, full repository check, and packaged-runtime smoke.
- [x] Verify the isolated offline command returns the exact eight-model catalog.
- [x] Run the authorized staging Agnes smoke matrix if an approved staging installation is locally
  available without exposing credentials.
- [x] Parse all staging JSON/NDJSON events and reject structured errors even when exit status is zero,
  or document the identity prerequisite when the matrix cannot start.
- [x] Review the final diff and working-tree status for unintended or generated artifacts.

### Relevant Files

- Source, tests, scripts, and docs changed by Steps A-C
- Temporary staging harness and state outside the repository, if staging auth is available

### Expected Changes

- modify: `PLAN.md` statuses and validation results only
- create: temporary uncommitted smoke state outside the repository, removed after use

### Do Not Modify

- Hosted configuration, remote secrets, or release state before explicit authorization
- Personal CLI state or credential-bearing files

### Commands

```bash
npm run build
npm run check
node scripts/ci-package-smoke.mjs
git diff --check
git status --short --branch
```

### Acceptance Criteria

- [x] Focused tests, build, `npm run check`, and package smoke pass.
- [x] Packaged `adrouter --offline --list-models adrouter` returns all eight exact IDs.
- [x] Staging checks either pass the approved matrix or are documented as skipped for unavailable
  installation identity.
- [x] Authenticated staging settlement assertions are explicitly skipped because no approved
  installation identity is configured; no false success is recorded from exit status alone.
- [x] Focused provider tests preserve sponsor data outside messages, tools, commands, and edits.
- [x] Before release authorization, the implementation diff contained no release/deployment,
  dependency, version, or unrelated changes.

### Validation Results

- Build: passed on 2026-08-02.
- Full check: passed on 2026-08-02.
- Package smoke: passed on 2026-08-02 after using a disposable npm cache and a bounded registry
  retry; the initial user-cache permissions failure and registry timeout did not affect source.
- Staging authenticated smoke: skipped on 2026-08-02 because redacted doctor reported
  `auth.available: false` and an unconfigured installation. Public readiness/catalog checks passed.
- Pre-release diff review: passed on 2026-08-02; release manifests, versions, lockfiles, workflows,
  tags, npm state, and GitHub release state were unchanged at that checkpoint.

### Findings / Notes

- Staging smoke requires an existing user-approved installation. No credential discovery or hosted
  mutation will be attempted to manufacture one.

---

## Step E: Stage and promote beta.17

### Status

`in_progress`

### Objective

Release the reviewed Agnes changes as the immutable `0.81.0-beta.17` candidate, then promote npm
and GitHub only after the protected acceptance gates pass.

### Tasks

- [x] Receive explicit authorization for npm/GitHub release operations.
- [x] Re-query GitHub/npm state and confirm beta.17 is unused.
- [x] Prepare lockstep beta.17 versions, release metadata, public notes, and packaged shrinkwrap.
- [x] Pass build, checks, isolated tests, release readiness, and packaged-runtime smoke locally.
- [ ] Commit, push, and pass the six-platform release CI on the exact beta.17 source.
- [ ] Tag the exact accepted commit and verify the attested draft GitHub prerelease.
- [ ] Publish the exact staged tarball under npm `candidate`.
- [ ] Complete and upload redacted authentication acceptance for two distinct cohorts.
- [ ] Run the protected finalizer and verify npm `beta`/`latest`, candidate removal, and the public
  GitHub prerelease.

### Constraints

- Use only protected workflows for npm publication and GitHub release publication.
- Never print, copy, or commit npm, GitHub, or AdRouter credentials.
- Fix forward with a higher beta if any immutable candidate or tag fails.

### Validation Results

- GitHub authentication and repository admin/write/workflow permission: verified on 2026-08-02.
- Beta.17 npm version, Git tag, and GitHub release: confirmed unused on 2026-08-02.
- Build, full check, isolated tests, release readiness, and packaged beta.17 smoke: passed on
  2026-08-02. The sandboxed isolated-test attempt failed only on denied loopback/DNS; the permitted
  rerun passed 73 AI, 16 agent, and 175 CLI test files plus the TUI suite.

---

## Follow-up Work

- Coordinate other clients only if their independently owned catalogs require the same contract.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-02 | Scope absent-value overrides to exact Agnes IDs | Fixes Agnes without changing global provider semantics | DeepSeek, MiMo, and custom fallbacks remain unchanged |
| 2026-08-02 | Keep Agnes Pro and Pro Alpha high-only | Matches the finalized Router descriptor | Unsupported CLI selections continue to clamp to high |
| 2026-08-02 | Preserve MiMo absent reasoning as `medium` | Explicit compatibility choice from planning | Regression tests lock the existing behavior |
| 2026-08-02 | Release as `0.81.0-beta.17` through protected workflows | User explicitly authorized npm/GitHub deployment; beta.17 is unused | Candidate publication precedes final channel movement |
