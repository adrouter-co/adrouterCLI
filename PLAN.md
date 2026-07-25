# Plan: Package and release AdRouterCLI 0.81.0-beta.4

## Goal

Publish one production-faithful `@adrouter/cli@0.81.0-beta.4` package that embeds the private
`@adrouter/agent-core`, `@adrouter/ai`, and `@adrouter/tui` workspaces, proves the installed
runtime on every supported platform, promotes npm only after those gates pass, and publishes
the matching GitHub prerelease.

## Context

The public beta.3 package is the current `beta` and `latest`. The beta.4 candidate fixes missing
private runtime packages and makes bundled extensions, skills, `/reload`, `/new`, profiles, and
installation diagnostics part of the deployable-package contract. Only `@adrouter/cli` is public;
the internal packages remain exact-version private workspaces embedded through
`bundleDependencies`.

The working tree also contains unrelated notes and Tier A debugging work. Preserve those changes,
but exclude them from the release commit and validate the release from a clean checkout.

## Research Summary

- npm `bundleDependencies` embeds named dependencies in the packed tarball while retaining their
  dependency declarations.
- A scoped public package can be published from GitHub Actions with a granular token and npm
  provenance.
- GitHub draft releases allow every asset and attestation to be present before publication.
- The six selected GitHub-hosted runner labels cover macOS, Linux, and Windows on arm64 and x64.

## Constraints

- Publish only `@adrouter/cli`; never publish the three internal packages independently.
- Preserve Node.js `>=22.19.0`, command names, public APIs, routes, and persisted state.
- Publish the exact tarball recorded by the protected tag workflow, not a rebuilt artifact.
- Keep `beta` and `latest` on beta.3 until all candidate installation gates pass.
- Never overwrite, reuse, or unpublish an npm version.
- Keep credentials out of source, logs, artifacts, anonymous install jobs, and local notes.
- Keep standalone native archives blocked until platform signing and certification exist.

## Out of Scope

- Stable `0.81.0` promotion before the documented soak and cohort evidence.
- GitHub Packages or independently published internal packages.
- Native standalone archives.
- TUI redesign, Tier A visual changes, backend authorization, or unrelated cleanup.

## Reversibility

The package and runtime changes remain isolated to release scripts, manifests, diagnostics, and
tests. npm final tags do not move until the exact candidate is verified on all six platforms.
Before promotion, failure leaves beta.3 and the draft GitHub release unchanged. After an immutable
candidate publication, recovery is deprecation plus beta.5, never unpublish or overwrite.

---

## Step A: Complete the bundled package and runtime contract

### Status

`review`

### Objective

Make the staged CLI tarball self-contained for private AdRouter runtime packages and fail closed
when required bundled features are incomplete.

### Tasks

- [x] Keep all workspaces lockstep at beta.4 and all internal workspaces private.
- [x] Materialize the three private packages as real nested directories in the CLI tarball.
- [x] Generate a shrinkwrap with `inBundle` entries and no internal registry tarball URLs.
- [x] Guard unsupported direct workspace packing and publishing.
- [x] Add packaged/source-linked installation diagnostics and bundled-feature readiness.
- [x] Verify every bundled extension and skill across startup, `/reload`, and `/new`.
- [x] Make `install:local` use the production-faithful tarball path and keep `link:dev` separate.

### Relevant Files

- `packages/coding-agent/`
- `scripts/npm-artifact.mjs`
- `scripts/verify-installed-runtime.mjs`

### Expected Changes

- modify: package manifests, shrinkwrap, runtime diagnostics, resource loading, and tests
- create: bundled-feature, installation, local-install, and installed-runtime helpers

### Do Not Modify

- Internal package names or source module boundaries
- Hosted router credential handling
- Unrelated ad rendering behavior

### Commands

```bash
npm run build
npm run check:shrinkwrap
node scripts/ci-package-smoke.mjs
```

### Acceptance Criteria

- [x] The tarball contains all three private packages as non-symlink directories.
- [x] Required runtime assets, licenses, notices, extensions, and skills are present.
- [x] Doctor reports packaged installations as deployable and incomplete/source links as non-deployable.
- [x] A clean global install has no npm dependency-tree problems.

### Validation Results

- `npm run build`: passed on the current compatible local Node.js runtime
- `node scripts/ci-package-smoke.mjs`: passed with a staged tarball and isolated global prefix
- exact Node.js 22.19 and remote platform matrix: not run

### Findings / Notes

- The installed runtime must retain private dependencies under
  `@adrouter/cli/node_modules/@adrouter/`; workspace links are not deployment evidence.

---

## Step B: Make candidate publication and final promotion resumable

### Status

`review`

### Objective

Implement a guarded `missing -> candidate -> final` release state machine using the exact tagged
artifact.

### Tasks

- [x] Add `publish-candidate` and `finalize-release` workflow phases.
- [x] Publish the recorded tarball with provenance and a scoped `NPM_TOKEN`.
- [x] Accept an exact candidate or already-final publication on safe reruns.
- [x] Reject integrity, metadata, version, or conflicting-tag mismatches.
- [x] Run six anonymous exact-version registry installs before final tags move.
- [x] Make dist-tag promotion, candidate removal, deprecation, and GitHub publication idempotent.
- [x] Allow release-asset verification after a draft has already been published.
- [x] Remove dependency caches from release-producing and publishing jobs.

### Relevant Files

- `.github/workflows/`
- `scripts/publish.mjs`
- `scripts/promote-npm-tags.mjs`

### Expected Changes

- modify: candidate publication, registry verification, promotion, release verification, and tests

### Do Not Modify

- Canonical repository guards
- Six-platform matrix
- Ordering that requires npm promotion before GitHub publication

### Commands

```bash
npm run check:release-metadata
node --test scripts/release-policy.test.mjs scripts/verify-draft-release.test.mjs
```

### Acceptance Criteria

- [x] The workflow itself publishes the exact recorded candidate; no undocumented manual gap remains.
- [x] Candidate and final phases are safe to rerun after successful or partial execution.
- [x] npm final tags cannot move until all six registry-install jobs succeed.
- [x] GitHub publication cannot precede verified npm final state.

### Validation Results

- focused release policy tests: passed
- workflow execution against npm/GitHub: not run; authentication pending

### Findings / Notes

- `NPM_TOKEN` must be a short-lived granular token limited to `@adrouter/cli`, with read/write and
  bypass-2FA enabled for CI.

---

## Step C: Document and prepare the authenticated release

### Status

`review`

### Objective

Leave a decision-complete runbook and explicit credential boundary for the maintainer.

### Tasks

- [x] Document the two workflow phases and exact ordering.
- [x] Document npm, GitHub, and AdRouter staging authentication separately.
- [x] Require a protected `npm-publish` environment and short-lived token revocation.
- [x] Preserve the stable-release soak and immutable-version recovery rules.
- [ ] Configure `NPM_TOKEN` and `ADROUTER_STAGING_API_KEY` after the user supplies access.
- [ ] Authenticate the maintainer's GitHub CLI/git session.

### Relevant Files

- `docs/releasing.md`
- `release-manifest.json`
- `README.md`

### Expected Changes

- modify: release and authentication runbook

### Do Not Modify

- Local `.env.local` files
- Shell profiles
- Remote secrets before the user provides authentication

### Commands

```bash
gh auth status --hostname github.com
npm view @adrouter/cli dist-tags --json
```

### Acceptance Criteria

- [x] No credential type is reused for another system.
- [x] Anonymous install jobs receive no npm authentication.
- [ ] Required GitHub environments and secrets exist.
- [ ] The release maintainer can push the protected tag and approve deployments.

### Validation Results

- documentation checks: passed
- authenticated checks: not run

### Findings / Notes

- GitHub release creation uses the workflow `GITHUB_TOKEN`; it does not require a repository PAT.

---

## Step D: Final verification and cleanup

### Status

`review`

### Objective

Validate the complete release slice from a clean checkout and leave only remote/authenticated gates.

### Tasks

- [x] Run the full static, metadata, isolated-test, readiness, and package-smoke suites.
- [x] Review the final diff for unrelated changes and secret/local-path leakage.
- [ ] Repeat release gates on Node.js 22.19 in GitHub Actions.
- [x] Record final validation results and remaining remote gates.

### Relevant Files

- all release-related modified files
- `PLAN.md`

### Expected Changes

- modify: validation results and final statuses only if failures require no production fix

### Do Not Modify

- Unrelated user work
- Git history, tags, npm state, GitHub releases, or secrets

### Commands

```bash
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
git diff --check
```

### Acceptance Criteria

- [x] Every local release gate passes when scoped to the release boundary.
- [x] The artifact contains no secret, personal path, unsupported link, or native executable.
- [ ] Only authentication, push/tag, six-platform CI, and remote publication remain.
- [ ] No unintended files are included in the release slice.

### Validation Results

- `npm run build`: passed
- `npm run check:release-readiness`: passed
- `npm run check:release-metadata`: passed (15 tests)
- `npm run test:isolated`: passed outside the filesystem sandbox (the sandbox blocks loopback
  listeners with `EPERM`; 498 AI, 180 agent, and 1,511 CLI tests passed, with documented skips)
- `node --test scripts/install-local.test.mjs`: passed
- `node scripts/ci-package-smoke.mjs`: passed against the exact staged tarball
- publication dry run: passed; one 17,843,967-byte beta.4 tarball with 102 bundled dependencies
- workflow YAML parsing, release-script syntax checks, and `git diff --check`: passed
- `npm run check`: every release-owned gate passed; the aggregate command stops at
  `check:public-boundary` only because the preserved, unrelated untracked `docs/bugs.md` contains a
  developer-local path. Branding, docs, release metadata, type checking, and browser smoke were
  then run independently and passed.

### Findings / Notes

- `docs/bugs.md` contains private developer paths and must remain outside the release boundary.
- `scripts/tier-a-debug-server.mjs` is unrelated debug work and must also remain outside the release
  boundary.
- Node.js 22.19, the clean-checkout aggregate gate, and the six hosted runner platforms remain
  protected GitHub Actions gates after authentication and release-slice review.

---

## Follow-up Work

- Configure credentials and execute the two protected workflow phases.
- Monitor beta.4 for at least 48 hours and collect packaged-user evidence on macOS, Linux, and
  Windows before planning stable `0.81.0`.
- Revoke the temporary npm token after final verification.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-07-25 | Publish beta.4 to both `beta` and `latest` | Selected release policy and current beta channel behavior | beta.4 becomes the default npm install |
| 2026-07-25 | Publish a GitHub prerelease, not GitHub Packages | Avoid duplicate registry policy | One npm package plus attested GitHub assets |
| 2026-07-25 | Use a scoped CI token | Enables automated candidate publication, tag promotion, and deprecation | Requires protected secret and post-release revocation |
| 2026-07-25 | Keep private workspaces bundled | Fixes missing installed runtimes without publishing internal packages | One public tarball with three embedded private packages |
