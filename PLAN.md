# Plan: Fix-forward AdRouterCLI DPoP nonce handling and release beta.22

## Goal

Publish and accept an immutable `0.81.0-beta.22` security fix-forward that completes repeated hosted signed requests without replaying a consumed DPoP nonce, while keeping public `beta` and `latest` on beta.20 until exact-artifact acceptance is complete.

## Context

The exact `0.81.0-beta.21` candidate enrolled successfully on the primary macOS ARM64 cohort and passed redacted `/v1/profile` diagnostics, but a hosted agent turn failed with `401 invalid_dpop_proof` on the continuation after a local read tool. Source inspection confirmed that beta.21 retains the challenge nonce in an origin-wide map after the retry succeeds, then reuses that server-consumed value on the next signed request. The protected server rejects the nonce replay as designed.

The user authorized fix-forward releases and required security acceptance to finish before the preserved Pi/cache/subagent work. Because beta.22 is now consumed by this security correction, the follow-on CLI feature candidate moves to the next unused version, expected to be beta.23 after fresh registry and tag checks.

## Research Summary

RFC 9449 section 8 describes a nonce challenge/retry flow and permits a server to provide the next nonce on a successful response. The local AdRouter server contract is stricter: its issued access nonce is consumed once, and a successful response currently does not provide a replacement. The compatible client behavior is therefore to use a cached server-provided nonce at most once, keep a challenge nonce local to its immediate retry, and retain only a new nonce received on the final response.

## Constraints

- Preserve existing user-facing behavior except for correcting repeated hosted signed requests.
- Keep the implementation small, reviewable, and reversible.
- Prefer a minimal diff and introduce no new dependencies.
- Preserve all public APIs, routes, request bodies, proof fields, model catalog, sponsor isolation, and persisted credential formats.
- Do not put the preserved Pi/cache/subagent changes on this security branch or PR.
- Never retarget a tag, replace an asset, or republish an immutable npm version.
- Use Node.js 22.19.0 for release verification and require all six-platform protected CI jobs.
- Keep `beta` and `latest` unchanged until exact beta.22 Mac and physical Windows acceptance succeeds.

## Out of Scope

- Router, WebUI, Landing, Agent, and OpenCode source or deployment changes.
- Changes to nonce generation, replay storage, enrollment schemas, or server policy.
- Pi 0.84.1, cache optimization, subagent behavior, or other opportunistic cleanup.
- Stable-channel promotion or native archive expansion.

## Reversibility

The runtime correction and its regression tests will be isolated in one security PR. Before tagging, the branch can be amended or abandoned without affecting public channels. After publication, any defect must be fixed with the next unused beta; beta.22 itself will remain immutable.

---

## Step A: Reproduce and specify nonce consumption

### Status

`done`

### Objective

Capture the beta.21 failure in focused tests and define the one-use client nonce lifecycle without widening authentication contracts.

### Tasks

- [x] Reproduce the exact candidate failure after a successful hosted enrollment and first streamed tool step.
- [x] Confirm the redacted profile diagnostic remains healthy on the same installation.
- [x] Add focused transport and installation-auth tests covering two consecutive signed requests.
- [x] Cover retention of a genuinely new nonce returned by the final response.

### Relevant Files

- `packages/ai/src/api/adrouter.ts`
- `packages/ai/test/adrouter.test.ts`
- `packages/coding-agent/src/core/adrouter-auth.ts`
- `packages/coding-agent/test/adrouter-auth.test.ts`

### Expected Changes

- modify: `packages/ai/test/adrouter.test.ts`
- modify: `packages/coding-agent/test/adrouter-auth.test.ts`

### Do Not Modify

- Hosted route, proof-claim, header, or credential-storage contracts.
- Server code or any sibling repository.

### Commands

```bash
npm run test --workspace @adrouter/ai -- test/adrouter.test.ts
npm run test --workspace @adrouter/cli -- test/adrouter-auth.test.ts
```

### Acceptance Criteria

- [x] A regression test fails against beta.21 behavior by detecting reuse of a consumed nonce.
- [x] Tests distinguish the immediate challenge nonce from a new final-response nonce.
- [x] No test fixture contains live credentials, proofs, keys, or nonce values from acceptance.

### Validation Results

- exact beta.21 Mac hosted canary: failed on the post-tool continuation with `401 invalid_dpop_proof`
- exact beta.21 redacted doctor: passed; installation ready, `file_protected`, refresh valid, signed requests enabled
- focused tests against unchanged beta.21 behavior: failed as expected on both retained challenge and final-response nonce reuse
- focused tests after the fix: passed, AI 31/31 and CLI installation auth 12/12

### Findings / Notes

- The failure is deterministic from the client lifecycle: `rememberNonce()` stored the challenge nonce before the successful retry, leaving it available for the next request.
- Synthetic nonce values are used throughout the tests; no live acceptance proof or nonce was captured.

---

## Step B: Implement and prepare the security fix-forward

### Status

`done`

### Objective

Consume cached nonces exactly once, keep challenge nonces local to their retry, and prepare consistent beta.22 release metadata.

### Tasks

- [x] Add a one-use nonce retrieval path in installation auth.
- [x] Stop persisting an intermediate challenge nonce before its immediate retry.
- [x] Preserve a valid nonce supplied by the final response for one subsequent request.
- [x] Update all manifests, lockfiles, shrinkwrap, changelogs, and `release-manifest.json` to beta.22 with beta.21 as `supersedes`.
- [x] Review the diff to confirm no preserved feature work is present.

### Relevant Files

- `packages/coding-agent/src/core/adrouter-auth.ts`
- `packages/ai/src/api/adrouter.ts`
- `package.json`
- `package-lock.json`
- `packages/*/package.json`
- `packages/coding-agent/npm-shrinkwrap.json`
- `packages/*/docs/CHANGELOG.md`
- `release-manifest.json`

### Expected Changes

- modify: the listed runtime, tests, version, changelog, lock, shrinkwrap, and release-manifest files

### Do Not Modify

- Generated model catalog or upstream bundles.
- Agent desktop repository or workspace state documentation during this code step.

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

- [x] Consecutive signed profile/turn requests never reuse an already-consumed nonce.
- [x] A final-response nonce is retained and used at most once.
- [x] Existing replay, tamper, key-binding, refresh rotation, revocation, and redaction tests remain green.
- [x] Every release identity is exactly `0.81.0-beta.22` and supersedes beta.21.
- [x] The working tree contains no Pi/cache/subagent changes.

### Validation Results

- `npm ci --ignore-scripts`: passed under Node.js 22.19.0
- `npm run build`: passed
- `npm run check`: passed
- `npm run test:isolated`: passed outside the restricted sandbox; AI 522, TUI 824, agent core 183, and CLI 1,504 tests passed with only intentional skips
- `npm run check:release-readiness`: passed
- `node scripts/ci-package-smoke.mjs`: passed, including packaged command/resource and profile round-trip smokes
- isolated production-faithful install: passed for `0.81.0-beta.22`
- live hosted post-tool continuation canary: passed and returned the exact README heading without proof rejection

### Findings / Notes

- If beta.22 is found remotely before tagging, advance all security release metadata to the next unused beta and reserve the following version for the feature candidate.
- The first isolated-suite attempt was expectedly blocked by sandbox `listen EPERM` and DNS restrictions; the identical unrestricted run passed.
- A transient redacted-doctor readiness timeout was not reproducible at the public endpoints; direct `/health/ready` and schema-2 `/v1/models` checks passed with the expected catalog digest.

---

## Step C: Publish and accept the protected beta.22 candidate

### Status

`todo`

### Objective

Merge through protected main, publish the exact immutable candidate, and complete real Mac and physical Windows security acceptance before finalization.

### Tasks

- [ ] Open the security PR and require the six-platform CI matrix plus CodeQL.
- [ ] Squash-merge only after required checks pass; capture the protected-main SHA.
- [ ] Re-query npm versions/dist-tags, GitHub tags/releases, PR head, staging readiness, and model catalog before tagging.
- [ ] Tag the exact merge SHA and verify draft inventory, checksums, attestations, SBOM, manifest, and source identity.
- [ ] Publish under `candidate` only and verify `beta`/`latest` remain unchanged.
- [ ] Install the exact candidate anonymously on the primary Mac and physical Windows 11 x64 cohort.
- [ ] Complete the schema-1 security matrix, attach the validated redacted acceptance asset, and finalize only if every required result is true.
- [ ] Revoke temporary npm publication credentials after final verification.

### Relevant Files

- `.github/workflows/ci.yml`
- `.github/workflows/release-tag.yml`
- `.github/workflows/promote-release.yml`
- `scripts/validate-auth-acceptance.mjs`
- `release-manifest.json`

### Expected Changes

- create: protected Git commit, tag, draft release assets, and redacted acceptance asset through documented workflows
- modify: npm dist-tags only during explicitly authorized candidate publication and finalization

### Do Not Modify

- Existing immutable beta.21 tag, npm bytes, or release assets.
- Public channels before acceptance is complete.
- Any hosted service, database, traffic gate, or signing configuration.

### Commands

```bash
gh pr checks --watch
gh workflow run promote-release.yml -f tag=v0.81.0-beta.22 -f phase=publish-candidate
node scripts/validate-auth-acceptance.mjs authentication-acceptance.json release-manifest.json
gh workflow run promote-release.yml -f tag=v0.81.0-beta.22 -f phase=finalize-release
```

### Acceptance Criteria

- [ ] Git tag, GitHub release, npm integrity, manifest, and protected-main SHA agree exactly.
- [ ] Mac and Windows exact-version cohorts complete all required schema-1 authentication results.
- [ ] After finalization, `candidate` is removed and `beta`/`latest` resolve exactly to beta.22.
- [ ] The beta.21 candidate is deprecated with a fix-forward notice, not unpublished or mutated.

### Validation Results

- protected CI: not run
- candidate workflow: not run
- Mac acceptance: not run
- Windows acceptance: not run
- finalization: not run

### Findings / Notes

- Publication and finalization stop immediately on any identity, integrity, acceptance, or platform mismatch.

---

## Step D: Final verification and cleanup

### Status

`todo`

### Objective

Record the immutable release evidence, leave clean release inputs, and hand the next unused version to the preserved follow-on candidate.

### Tasks

- [ ] Re-query npm tags/integrity, GitHub release/tag identity, and workflow results.
- [ ] Update workspace state/parity documentation with exact SHAs, integrity, runs, acceptance limits, and rollback points.
- [ ] Confirm the security release checkout is clean at the immutable accepted commit.
- [ ] Confirm the preserved feature branch remains clean and unchanged.
- [ ] Record remaining risks and the beta.23 follow-on starting point.

### Relevant Files

- `PLAN.md`
- workspace `docs/state.md`
- newest workspace parity report

### Expected Changes

- modify: `PLAN.md`
- modify: workspace state/parity documentation after release completion

### Do Not Modify

- Router, WebUI, Landing, OpenCode, or accepted immutable release artifacts.

### Commands

```bash
git status --short --branch
npm view @adrouter/cli dist-tags --json
gh release view v0.81.0-beta.22 --json tagName,targetCommitish,isDraft,isPrerelease,assets
```

### Acceptance Criteria

- [ ] Recorded evidence can reconstruct the exact released source and registry bytes.
- [ ] Temporary credentials are revoked and no acceptance secret is retained.
- [ ] Both security and preserved feature checkouts are clean at documented commits.
- [ ] No unrelated repository or hosted deployment changed.

### Validation Results

- final identity audit: not run
- clean-checkout audit: not run

### Findings / Notes

- The later Pi/cache/subagent rollout remains candidate-only and requires fresh authorization for any public promotion.

---

## Follow-up Work

- After beta.22 is accepted and finalized, prepare the preserved CLI Pi/cache/subagent work as the next unused candidate, expected `0.81.0-beta.23`, without moving public channels.
- Begin the Agent feature candidate only after the CLI follow-on candidate and its required Mac/Windows canaries pass.
- If Agent beta.17 shows the same nonce lifecycle defect under repeated signed requests, fix it forward before any Agent feature candidate and increment its reserved version accordingly.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-11 | Stop beta.21 finalization and fix forward | Exact-artifact Mac acceptance reproduced a signed-request failure after a tool continuation. | Public beta/latest remain on beta.20; beta.22 becomes the security correction. |
| 2026-08-11 | Consume cached access nonces at most once | The server consumes each issued nonce and does not return a successor on successful access responses. | Prevents nonce replay while preserving challenge/retry and future final-response nonce support. |
| 2026-08-11 | Move the preserved feature candidate to beta.23 | Immutable beta.22 is now required for the security fix. | Pi/cache/subagent work remains isolated and follows security acceptance. |
