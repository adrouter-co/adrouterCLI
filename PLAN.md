# Plan: Pi and external-extension upgrade workflow

## Goal

Create a reproducible upstream-intake workflow, synchronize AdRouterCLI with Pi 0.84.1, restore a
conservative AdRouter cache optimizer, upgrade the bundled subagent runtime through a strict safe
subset, port the accepted behavior to the desktop Agent, finalize the preceding security release,
and publish the implementation as the next immutable npm candidate.

## Context

- AdRouterCLI is a four-package npm monorepo forked from Pi and releases its packages in lockstep.
- The baseline CLI vendored pi-subagents 0.30.0, pi-web-access 0.13.0, and BTW; the earlier cache
  optimizer was retired with provider registration and executable `models.json` configuration.
- The desktop Agent consumes exact upstream Pi dependencies directly and intentionally does not run
  arbitrary executable Pi extensions.
- This wave freezes Pi 0.84.1, pi-cache-optimizer 2.8.2, and pi-subagents 0.45.2. A newer release
  discovered during implementation is recorded for the next wave rather than silently expanding
  scope.
- The user selected controlled Pi core sync, stats-first cache optimization with prompt rewrite
  opt-in, and a bounded subagent subset.

## Research Summary

- Pi 0.84.1 introduces TypeBox 1.3.7, request-transform and provider-header changes, delta-only
  message updates, new session/repository APIs, and optional telemetry/client/protocol features.
- pi-cache-optimizer 2.8.2 mixes useful prompt-prefix/statistics logic with provider mutation,
  `models.json` surgery, and raw provider cache controls that are incompatible with hosted
  `/v1/agent/turn`.
- pi-subagents 0.45.2 adds workflow scripts, missions, schedules, intercom, worktrees, watchdogs,
  profiles, and nested delegation. Only structured run/parallel/lifecycle behavior is in scope.
- Router already returns authoritative cache-read/cache-write settlement data and does not expose a
  client cache-hint field. This wave therefore leaves the hosted Router request schema unchanged.

## Constraints

- Preserve hosted installation auth, DPoP proofs, exact Router endpoints, generated model catalog,
  workspace trust, approvals, redaction, bounded streaming, and local session ownership.
- Sponsor and settlement data must remain outside prompts, assistant text, tools, commands, edits,
  child-agent context, and compaction.
- Preserve existing public behavior unless this plan explicitly narrows the bundled extension
  surface; keep compatibility adapters for existing chain commands.
- Keep changes reviewable and reversible; use exact versions, checked-in lockfiles, and no runtime
  downloads.
- Do not add upstream credential export, provider registration, executable `models.json`, self
  update, telemetry egress, or remote client/server product surfaces.
- Keep CLI and Agent histories, lockfiles, toolchains, tags, and release channels independent.
- The user explicitly authorized finalizing the preceding CLI and Agent security releases, then
  publishing the follow-on CLI and Agent candidates. No other tag, channel, hosted service, database,
  traffic, signing, or deployment mutation is authorized.

## Out of Scope

- Updating pi-web-access, BTW, unrelated TUI overlays, Router cache-hint APIs, or OpenCode.
- Enabling subagent missions, schedules, Gist sharing, external intercom, managed worktrees,
  watchdog automation, provider profiles, nested delegation, or arbitrary workflow JavaScript.
- Redesigning unrelated desktop UI or replacing the Agent's native sandbox/approval architecture.
- Finalizing the follow-on Pi/cache/subagent candidate, stable publication, or any hosted-service
  deployment.

## Reversibility

- Land upstream governance, Pi core, cache, subagents, and Agent work as separable phases.
- Preserve compatibility adapters and keep cache prompt rewriting opt-in.
- Provide independent local kill switches for cache optimization and subagents.
- Reconstruct vendored bundles from exact upstream sources plus reviewed local patches.
- Fix forward under a higher immutable prerelease if a published artifact later regresses.

---

## Step A: Reproducible upstream intake and provenance

### Status

`done`

### Objective

Make exact upstream discovery, verification, staging, provenance, and bundle contracts repeatable.

### Tasks

- [x] Add one canonical upstream lock covering Pi core and bundled third-party sources.
- [x] Add offline validation, live advisory audit, and clean-tree exact staging commands.
- [x] Generate or validate runtime bundle contracts and packaged provenance from the lock.
- [x] Remove scattered hard-coded bundle versions where the central manifest can drive them.

### Relevant Files

- `upstreams.lock.json`
- `scripts/`
- `docs/bundled-sources.json`
- `packages/coding-agent/src/core/bundled-features.ts`

### Expected Changes

- create: canonical lock, schema/check/audit/stage scripts, focused tests, workflow documentation
- modify: package scripts, bundle contracts, provenance and release-readiness checks
- delete: no bundled source in this step

### Do Not Modify

- hosted auth/model/Router contracts
- generated model catalogs
- npm/GitHub release state

### Commands

```bash
npm run upstream:check
npm run upstream:audit
npm run check
```

### Acceptance Criteria

- [x] Locked sources include exact version, commit, source, integrity/hash, license, local patches,
      and feature disposition.
- [x] Offline checks fail on provenance drift or unexpected packaged bundle contents.
- [x] Live audit reports newer releases without changing files or failing ordinary CI for age alone.
- [x] No runtime path downloads executable extension source.

### Validation Results

- `npm run upstream:check`: passed (6 component records, 4 runtime extensions, 3 tests)
- `npm run upstream:audit`: passed; Pi 0.84.1, pi-subagents 0.45.2, and
  pi-cache-optimizer 2.8.2 remain current; pi-web-access 0.21.0 is recorded for a later wave
- `npm run check`: passed

### Findings / Notes

- Runtime bundle inventory and bundled-source notices are generated deterministically from the lock.
- The staging command requires an exact frozen target and a clean tree, verifies SHA-256 and npm
  integrity before extraction, and never modifies repository files.

---

## Step B: Controlled Pi 0.84.1 core synchronization

### Status

`done`

### Objective

Port the reviewed Pi 0.84.1 core into the existing four AdRouter packages without weakening product
or security boundaries.

### Tasks

- [x] Record an adopt/adapt/defer/reject ledger for upstream changes from the 0.81 baseline.
- [x] Port reviewed core changes and align host schemas on TypeBox 1.3.7.
- [x] Adapt nullable headers, agent settlement, event-bus lifecycle, tool termination, and TUI/path
      behavior without replacing AdRouter's existing streaming/session contracts.
- [x] Preserve current AdRouter RPC/JSON, auth, model, sponsor, approval, and session contracts.
- [x] Reject or disable upstream provider credentials, telemetry egress, self-update, and remote
      client/server surfaces.

### Relevant Files

- `packages/ai/`
- `packages/agent/`
- `packages/tui/`
- `packages/coding-agent/`

### Expected Changes

- modify: the four package sources, manifests, lockfile, focused tests, upstream provenance
- create: compatibility/adaptation ledger and any internal no-egress adapters required by the port
- delete: obsolete internals only after equivalent behavior is covered

### Do Not Modify

- generated `adrouter.models.ts` by hand
- hosted installation proof, official routes, or sponsor isolation
- package version/channel metadata for publication

### Commands

```bash
npm run typecheck
npm run check
```

### Acceptance Criteria

- [x] Pi 0.84.1 source identity and every intentional AdRouter divergence are documented.
- [x] Four package manifests and the lockfile remain internally consistent.
- [x] Existing JSON/RPC clients, auth flows, catalogs, compaction, tools, and TUI tests pass.
- [x] No new credential, provider-registration, self-update, or telemetry network authority exists.

### Validation Results

- `npx tsgo --noEmit`: passed
- `npm run check`: passed

### Findings / Notes

- Keep optional upstream client/protocol/fullscreen products deferred unless a reviewed core import
  cannot compile without an internal, non-public adapter.

---

## Step C: Conservative cache optimizer

### Status

`done`

### Objective

Restore truthful cache diagnostics and an explicitly enabled DeepSeek prompt-prefix optimizer while
leaving hosted Router request framing unchanged.

### Tasks

- [x] Derive a narrow AdRouter extension from pi-cache-optimizer 2.8.2 with exact provenance.
- [x] Implement `off`, `stats-only`, and `prompt-rewrite` modes with stats-only as the default.
- [x] Remove provider registration, `models.json`, compat/fix mutation, and raw hosted cache fields.
- [x] Restrict prompt rewrite to known stable instruction blocks and exclude skills compression.
- [x] Add truthful normalized-usage stats, secret-free doctor output, state permissions, and a kill
      switch.

### Relevant Files

- `packages/coding-agent/bundled/`
- `packages/coding-agent/src/core/`
- `packages/coding-agent/test/`

### Expected Changes

- create: adapted cache extension, license/provenance, focused unit/integration tests
- modify: bundle manifest/contracts, packaged inventory, documentation
- delete: no current provider or model configuration

### Do Not Modify

- hosted `/v1/agent/turn` body or proof calculation
- sponsor display/settlement separation
- official model catalog

### Commands

```bash
npm run upstream:check
npm run check
```

### Acceptance Criteria

- [x] Stats-only mode is request-byte neutral and reports only authoritative normalized usage.
- [x] Prompt rewrite is opt-in, DeepSeek-only, content-preserving, and sponsor-free.
- [x] No command reads or writes `models.json` or registers a provider.
- [x] Missing cache telemetry is shown as unavailable rather than fabricated.

### Validation Results

- `npm run upstream:check`: passed (6 component records, 4 runtime extensions)
- focused cache tests: passed (7 tests; package suite 38 tests)
- `npm run check`: passed

### Findings / Notes

- Live cache-effectiveness canaries are manual candidate acceptance, not production automation.

---

## Step D: Safe pi-subagents 0.45.2 subset

### Status

`done`

### Objective

Adopt the current subagent lifecycle internals while exposing only bounded structured execution and
management compatible with AdRouter trust and approval policy.

### Tasks

- [x] Reconstruct the source-derived bundle against pi-subagents 0.45.2 plus reviewed AdRouter patches.
- [x] Keep structured single, parallel, and compatibility chain execution; do not expose arbitrary
      workflow JavaScript.
- [x] Allow only list/get/models/children/status/resume/stop/interrupt/doctor management actions.
- [x] Enforce three children, depth one, read-only parallel profiles, and a single mutating child.
- [x] Redirect executable/state paths to AdRouter and remove/deactivate every deferred subsystem.

### Relevant Files

- `packages/coding-agent/bundled/pi-subagents-*`
- `packages/coding-agent/src/core/bundled-features.ts`
- `packages/coding-agent/test/bundled-*`

### Expected Changes

- create: exact 0.45.2-derived bundle, patch/provenance record, policy wrapper and tests
- modify: command/tool contracts, packaged inventory, docs and readiness checks
- delete: old 0.30.0 bundle after reconstructed replacement passes

### Do Not Modify

- personal `~/.pi` or project `.pi` state
- hosted auth material, provider catalog, or sponsor context
- worktrees, schedules, missions, Gist, intercom, watchdog, nested delegation, or provider profiles

### Commands

```bash
npm run upstream:check
npm run check
npm run install:local
```

### Acceptance Criteria

- [x] Deferred fields/actions are absent from the public schema and rejected before execution.
- [x] Child launch, status, resume, stop, cancellation, cleanup, trust, and approval tests pass.
- [x] Children launch `adrouter`, use only `.adrouter` state, and never receive copied credentials
      or sponsor data.
- [x] The installed package contains only the exact declared bundle source and licenses.

### Validation Results

- focused subagent/loader/state/spawn tests: passed (34 tests; safe-subset file 7 tests)
- `npm run upstream:check`: passed (6 component records, 4 runtime extensions)
- `npm run check`: passed
- `npm run install:local`: passed; verified packaged `@adrouter/cli@0.81.0-beta.21` installed

### Findings / Notes

- Existing `/chain` and `/run-chain` remain bounded compatibility adapters during this wave.

---

## Step E: Desktop Agent follow-on

### Status

`done`

### Objective

Upgrade the independent Agent to the accepted Pi version and port cache/delegation behavior through
its native Router, utility-process, approval, and task abstractions.

### Tasks

- [x] Preserve and reconcile the Agent's existing beta.17/node-gyp working changes.
- [x] Upgrade exact Pi dependencies to 0.84.1 and update lock/override/physical-resolution policy.
- [x] Port cache modes natively without loading the CLI extension or changing Router framing.
- [x] Extend existing depth-one delegation with native status, follow-up/resume, and cancellation.
- [x] Keep declarative bundles Markdown-only and prove optional upstream packages have no authority.

### Relevant Files

- `../adrouterAgent/package.json`
- `../adrouterAgent/src/runtime/`
- `../adrouterAgent/src/main/`
- `../adrouterAgent/tests/`

### Expected Changes

- modify: exact dependencies/lock, dependency policy, runtime/provider/session/delegation code, tests
- create: native cache fixtures/settings and bounded delegation lifecycle coverage if missing
- delete: no user-owned beta.17 work or executable-extension boundary

### Do Not Modify

- `../adrouterAgent/PLAN.md` active release/security plan
- safeStorage identity, sandbox/approval boundary, normal one-task capacity, or Router wire contract
- unrelated renderer/release/channel behavior

### Commands

```bash
npm run check
npm run verify:release-readiness
npm run test:e2e
```

### Acceptance Criteria

- [x] Existing beta.17/node-gyp changes remain intact and attributable.
- [x] Pi dependencies resolve exactly to 0.84.1 with reviewed security overrides.
- [x] Cache modes and delegation limits match the accepted CLI policy without executable plugins.
- [x] Source, integration, launcher, and packaged security tests pass under Node.js 25.9.0.

### Validation Results

- `npm run check`: passed under Node.js 25.9.0 (162 unit tests, 13 integration tests, 47
  launcher/release tests, plus source/public/workflow checks)
- `npm run verify:release-readiness`: passed, including the exact launcher tarball allowlist
- `npm run test:e2e`: passed (2 packaged Electron tests)
- `npm run audit:build`: passed; the only high-severity nodes are the repository's reviewed,
  dev-only Forge advisory chain
- source parity: passed for 76 reviewed product files

### Findings / Notes

- The existing exact node-gyp 12.3.0 pin and associated provenance remained intact; the native broker
  rebuilt under Node.js 25.9.0 during the full gate.
- Pi auth/model authority remains app-owned through a network-disabled `ModelRuntime`; optional Pi
  client/protocol packages remain transitive-only and are not imported by the Agent session.

---

## Step F: Final verification and cleanup

### Status

`done`

### Objective

Prove the complete local CLI and Agent implementation, review all diffs, and leave publication as a
separately authorized action.

### Tasks

- [x] Run full CLI checks, production-faithful local install, and packaged inventory verification.
- [x] Run full Agent checks, release-readiness, packaged E2E, and relevant native distribution
      verification.
- [x] Review both repository diffs for unrelated changes, stale comments, temporary artifacts, and
      provenance drift.
- [x] Update developer documentation and record skipped manual/live/cross-platform acceptance.
- [x] Record residual risks and next-wave upstream releases without moving any public channel.

### Relevant Files

- `README.md`, `RELEASE.md`, `SECURITY.md`, upstream/bundle documentation
- `../adrouterAgent/README.md`, `../adrouterAgent/RELEASE.md`, `../adrouterAgent/SOURCE_PROVENANCE.md`

### Expected Changes

- modify: documentation and this plan with actual validation results
- create/delete: only intentional source artifacts already listed in prior steps

### Do Not Modify

- npm/GitHub tags, dist-tags, releases, protected environments, or hosted configuration
- ignored credentials or `.protected/`

### Commands

```bash
npm run check
npm run install:local
git diff --check
git status --short --branch
```

### Acceptance Criteria

- [x] Both repositories pass their full authorized local gates.
- [x] Installed/package artifacts match source, manifests, locks, provenance, and licenses.
- [x] Default cache and subagent behavior is bounded, reversible, and secret/sponsor-safe.
- [x] No unintended files or publication/deployment changes remain.

### Validation Results

- CLI `npm run check`: passed
- CLI `npm run install:local`: passed; installed verified packaged
  `@adrouter/cli@0.81.0-beta.21`
- CLI `npm run upstream:audit`: passed; frozen Pi/cache/subagent targets remain current
- Agent `npm run check`: passed under Node.js 25.9.0
- Agent `npm run verify:release-readiness`: passed
- Agent `npm run audit:build`: passed under the bounded dev-only advisory policy
- Agent packaged E2E/native verification: passed (2 Electron tests; native broker rebuilt with
  node-gyp 12.3.0 under Node.js 25.9.0)
- `git diff --check`: passed in both repositories

### Findings / Notes

- Physical Windows and live hosted cache canaries remain manual acceptance unless separately
  authorized and available.

---

## Step G: Publish the Pi follow-on candidate

### Status

`complete`

### Objective

Apply the completed upstream work to the exact beta.22 security source and publish it as immutable
beta.23 under npm `candidate` without moving public `beta` or `latest`.

### Tasks

- [x] Preserve the upstream implementation as an independent commit.
- [x] Reapply it to exact protected beta.22 source and prepare unused beta.23 release metadata.
- [x] Pass clean Node.js 22.19 release gates, protected six-platform CI, tagged draft verification,
      and exact npm candidate publication.
- [x] Stop after candidate publication; do not move npm `beta` or `latest` without a separately
      verified live Windows run and explicit authorization.

### Relevant Files

- `package.json`, workspace manifests, lockfile, shrinkwrap, and `release-manifest.json`
- `.github/workflows/`, changelogs, upstream provenance, and release documentation

### Expected Changes

- modify: next-beta release identity, changelogs, release evidence, and this plan
- create: immutable tag, protected draft release, and exact npm candidate through workflows
- delete: no source, prior artifact, tag, or public channel

### Do Not Modify

- hosted Router/WebUI contracts or state
- npm `beta`/`latest`, which remain on beta.20
- any immutable prior version, tag, or release asset

### Commands

```bash
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
```

### Acceptance Criteria

- [x] Beta.22 remains the immutable security candidate baseline used by beta.23 source.
- [x] Beta.23 resolves to one exact source commit and recorded tarball integrity.
- [x] Public `beta`/`latest` remain beta.20 while beta.23 is only `candidate`.
- [ ] Hosted auth, sponsor isolation, cache modes, and bounded subagent behavior remain pending
      exact-artifact candidate acceptance.

### Validation Results

- local Node.js 22.19 `npm run check`: passed
- local Node.js 22.19 `npm run check:release-readiness`: passed
- protected six-platform matrix and CodeQL: passed; run `31607564741`
- tag staging/attestation: passed; run `31610813875`
- candidate publication: passed on resumable attempt 2; run `31611419261`
- npm `candidate=0.81.0-beta.23`; exact integrity
  `sha512-cQz2hS9nPVPM5PJQbvyDVkOA2JURNMtBjfW464nt8thzdgv6gBDczwt4x/FVgU7iufodXGzEzDwGpHBVlcs3hw==`
- full real-device installation-auth/revoke acceptance: not run

### Findings / Notes

- The first publication attempt succeeded before npm's read path exposed the package. The workflow
  resumed only after exact bytes and the `candidate` alias matched; no version or tag was replaced.
- Public `beta`/`latest` remain beta.20. Candidate finalization was not dispatched.

---

## Step H: Final verification and cleanup

### Status

`complete`

### Objective

Record exact local, candidate, public, and hosted identities and leave the release checkout clean.

### Tasks

- [x] Re-query npm and the completed GitHub workflow/tag evidence.
- [x] Record source SHA, tag, workflow runs, integrity, acceptance limits, and rollback point.
- [x] Review the release-input diff/status; candidate source was clean before the later
      session-audit-only `AGENTS.md` and `PLAN.md` updates.

### Acceptance Criteria

- [x] No unrecorded channel, hosted service, database, traffic, or release mutation occurred.
- [x] Any post-tag defect is assigned a higher immutable beta rather than replacing an artifact.

### Validation Results

- npm aliases and candidate integrity were reverified on 2026-08-13 and remain unchanged.
- Candidate-source status was clean at release handoff; the current working-tree changes are only
  the intentional governance/audit updates to `AGENTS.md` and `PLAN.md`.

---

## Follow-up Work

- Evaluate pi-web-access and BTW through the same upstream lock/audit/patch workflow.
- Consider a versioned Router cache-hint contract only after separate platform design and tests.
- Evaluate missions, schedules, managed worktrees, or richer desktop delegation as independent
  security/product changes.
- Triage any Pi or extension releases newer than this wave's frozen versions.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-11 | Freeze Pi 0.84.1, cache optimizer 2.8.2, and subagents 0.45.2. | Exact inputs keep a large cross-repository upgrade reviewable and reproducible. | Newer releases enter a later wave. |
| 2026-08-11 | Keep hosted Router framing unchanged. | The current API reports authoritative cache usage but has no cache-hint contract. | Cache optimization is stats-first and prompt-prefix-only. |
| 2026-08-11 | Expose a safe subagent subset. | New upstream automation surfaces exceed current AdRouter trust and approval boundaries. | Structured, depth-one delegation ships without missions, schedules, scripts, or worktrees. |
| 2026-08-11 | Port desktop behavior natively after CLI qualification. | The Agent does not execute arbitrary Pi extensions and owns separate release inputs. | Agent uses exact Pi 0.84.1 dependencies plus native cache and task-delegation abstractions. |
| 2026-08-11 | Finalize security releases before publishing follow-on candidates. | The security-only identities must remain reviewable and accepted before the broader upstream wave. | Beta.21/beta.17 become public first; the next CLI/Agent versions stop at `candidate`. |
| 2026-08-13 | Complete beta.23 candidate publication without finalization. | Exact protected workflow and registry evidence passed, including the integrity-gated propagation retry. | Beta.23 is on `candidate`; beta.20 remains on `beta`/`latest`, with broader real-device acceptance still open. |
