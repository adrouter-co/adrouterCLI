# Plan: Publish AdRouterCLI as one npm package

## Goal

Produce and validate a single public `@adrouter/cli@0.81.0-beta.2` npm tarball that embeds the private `@adrouter/ai`, `@adrouter/tui`, and `@adrouter/agent-core` workspaces through `bundleDependencies`, while preserving the existing commands, Node.js requirement, runtime behavior, six-platform gates, and closed-beta hosted authentication.

## Context

The repository currently treats all four AdRouter workspaces as public packages, packs and installs four tarballs, verifies a dependency-ordered four-package publication, and requires provenance during staged OIDC publication. The requested beta.2 release instead makes only `@adrouter/cli` public. Its three internal dependencies remain exact-version dependencies and distinct packages at runtime, but are packed into a temporary staging tree before the CLI alone is packed. The supplied release brief authorizes the version, public beta tag, initial `latest` behavior, direct bootstrap publication without provenance, and later trusted-publisher setup.

## Research Summary

- Current npm package metadata documentation states that `bundleDependencies` names dependencies to embed, while dependency versions remain declared in `dependencies`.
- Current npm pack documentation confirms `npm pack` creates a tarball from an installable package and that `--ignore-scripts` suppresses lifecycle scripts.
- Current npm publish documentation confirms a tarball can be published with explicit `--access public` and `--tag beta`; registry metadata documents that every package has a `latest` tag.
- npm package metadata includes `bundleDependencies` and `dist.integrity`, enabling post-publication comparison with the recorded SHA-512 artifact.
- Context7's required `resolve-library-id` and `query-docs` tools were unavailable in this session. The available current-docs index did not contain npm, so official npm and npm-registry documentation was used as the fallback.

## Constraints

- Preserve `npm install --global --ignore-scripts @adrouter/cli@beta`, `adrouter`, `adrouter-profile`, and Node.js `>=22.19.0`.
- Publish only `@adrouter/cli`; internal workspaces must be private and must not retain public publishing configuration.
- Use exact `0.81.0-beta.2` internal dependency versions and list all three in the CLI `bundleDependencies`.
- Build in a temporary staging directory by packing internal workspaces, installing those tarballs into the staged CLI tree, and packing only the staged CLI.
- Never reuse or overwrite beta.1; a defective beta.2 must be deprecated and superseded by beta.3.
- Preserve existing user-facing behavior unless explicitly stated otherwise.
- Keep the first implementation small, reviewable, and reversible.
- Prefer minimal diffs over broad rewrites.
- Do not introduce new dependencies unless the plan explicitly allows them.
- Preserve existing public APIs, routes, data formats, and persisted state unless explicitly stated otherwise.
- Do not include branded helper metadata, hidden metadata comments, or non-plan administrative sections.
- Do not publish, push, tag, authenticate, expose credentials, or change npm/GitHub remote state during local implementation and validation.

## Out of Scope

- Artifact-size optimization or flattening the internal module boundaries.
- Redesigning unrelated UI or changing hosted beta-key enforcement.
- Publishing native standalone archives currently marked blocked.
- Renaming unrelated files or modules.
- Opportunistic cleanup outside the release and package-policy paths.
- Performing the authenticated npm publication, immutable Git tag push, or GitHub prerelease publication before the required human/remote gates.

## Reversibility

Keep the packaging logic isolated in release scripts and preserve the internal workspace source layout. Update policy and tests alongside each release-path change so the old four-public-package assumptions are removed without flattening imports. Do not delete historical beta.1 evidence. Align commits with manifest/version changes, staged artifact construction, and workflow/documentation changes so each phase can be reviewed or reverted before any immutable tag or npm publication.

---

## Step A: Convert manifests and versioned metadata to beta.2

### Status

`done`

### Objective

Make the repository consistently describe one public CLI package and three private embedded workspaces at `0.81.0-beta.2`.

### Tasks

- [x] Bump the root, four workspace manifests, root lockfile, CLI shrinkwrap, changelogs, documentation, bundled-source records, and release manifest to `0.81.0-beta.2`.
- [x] Mark `@adrouter/ai`, `@adrouter/tui`, and `@adrouter/agent-core` private and remove their `publishConfig`.
- [x] Keep exact-version CLI dependencies and add the three internal names to the CLI `bundleDependencies`.
- [x] Set CLI publication metadata to public beta-compatible bootstrap behavior without forced provenance.
- [x] Regenerate and inspect lock/shrinkwrap data without registry references for embedded internal packages in the final CLI artifact.

### Relevant Files

- `package.json`
- `package-lock.json`
- `packages/{ai,tui,agent,coding-agent}/package.json`
- `packages/coding-agent/npm-shrinkwrap.json`
- `packages/*/docs/CHANGELOG.md`
- `README.md`
- `docs/`
- `release-manifest.json`

### Expected Changes

- modify: root and workspace versioned manifests and lock metadata
- modify: CLI bundle and publication declarations
- modify: release-facing version references and changelogs

### Do Not Modify

- Historical withdrawn beta.1 npm artifacts, remote tags, or draft releases
- Internal package names, import paths, exports, or source module boundaries
- Node.js engine floor or public executable names

### Commands

```bash
npm install --package-lock-only --ignore-scripts
npm run shrinkwrap:coding-agent
npm run check:shrinkwrap
rg '0\.81\.0-beta\.1' --glob '!node_modules/**'
```

### Acceptance Criteria

- [x] Every release-owned current-version field is `0.81.0-beta.2`.
- [x] All three internal manifests have `private: true` and no `publishConfig`.
- [x] The CLI declares exact internal dependencies and all three `bundleDependencies`.
- [x] No internal source package is made independently publishable.
- [x] No unintended changes were made outside expected version and packaging files.

### Validation Results

- `npm install --package-lock-only --ignore-scripts`: passed
- `npm run shrinkwrap:coding-agent`: passed
- `npm run check:shrinkwrap`: passed
- `rg '0\.81\.0-beta\.1' --glob '!node_modules/**'`: passed; no current release references remain outside the plan and excluded upstream history

### Findings / Notes

- The current CLI shrinkwrap generator synthesizes registry URLs for internal workspaces and must be adjusted for bundled-package semantics.

---

## Step B: Build and validate one staged CLI artifact

### Status

`done`

### Objective

Create the proven single tarball from a temporary staged CLI tree without relying on workspace symlinks or fetching internal registry packages.

### Tasks

- [x] Refactor release packaging to build all workspaces, pack the three private internals, copy the CLI publish tree into a temporary staging directory, and install internal tarballs there.
- [x] Pack only the staged `@adrouter/cli` and record its filename, version, size, shasum, and SHA-512 integrity.
- [x] Update package policy to require the declared bundled tree, internal package manifests/assets/licenses, CLI runtime assets, clean dependency closure, and no secrets, local paths, symlinks, or native executable payloads.
- [x] Update policy and release tests for one public artifact and initial beta/latest semantics.
- [x] Keep temporary staging/output outside the repository unless an explicit output path is requested.

### Relevant Files

- `scripts/publish.mjs`
- `scripts/local-release.mjs`
- `scripts/package-policy.mjs`
- `scripts/package-policy.test.mjs`
- `scripts/release-policy.mjs`
- `scripts/release-policy.test.mjs`
- `scripts/generate-coding-agent-shrinkwrap.mjs`
- `scripts/check-beta-release-readiness.mjs`

### Expected Changes

- modify: release artifact builder and manifest writer
- modify: package-policy validation and tests
- modify: beta readiness and release policy from four public packages to one

### Do Not Modify

- Runtime import specifiers or internal workspace source layout
- Existing credential and staging-canary secrecy controls
- Native artifact eligibility in `release-manifest.json`

### Commands

```bash
npm run build
node --test scripts/package-policy.test.mjs scripts/release-policy.test.mjs
node scripts/publish.mjs --dry-run --manifest /tmp/adrouter-npm-artifacts.json
node scripts/local-release.mjs --skip-binary --skip-bun-install
```

### Acceptance Criteria

- [x] Exactly one public tarball is produced and its manifest names `@adrouter/cli@0.81.0-beta.2`.
- [x] The tarball contains all three declared bundled packages under `node_modules/@adrouter/`.
- [x] Internal dependencies resolve from embedded content and no internal AdRouter registry tarball is needed during installation.
- [x] Policy validates licenses, runtime assets, dependency closure, clean paths/secrets, and absence of native executable payloads.
- [x] Artifact metadata records SHA-512 integrity for later registry comparison.

### Validation Results

- `npm run build`: passed
- `node --test scripts/package-policy.test.mjs scripts/release-policy.test.mjs`: passed
- `node scripts/publish.mjs --dry-run --out <temporary> --manifest <temporary>/npm-artifacts.json`: passed
- `node scripts/local-release.mjs --skip-binary --skip-bun-install`: covered by the stricter global-install `scripts/ci-package-smoke.mjs` path

### Findings / Notes

- npm does not include workspace symlinks in package tarballs, so the staging install must materialize real internal package directories before the final pack.
- Final local artifact: 17,838,500 bytes compressed, about 103.3 MB unpacked, SHA-512 `sha512-gMUhcd8Lzhde3Ei+Uwpl8QcvwCnOXIFoglhMqxzeE5QX7qHsyVGu8V7vWLD7bLMyUpedKcVm5JPQPDNyIzqprw==`.
- Global `npm ls --all` exposed a `retry` hoisting conflict; the CLI now pins compatible `retry@0.12.0` at its root while the AI tree retains its nested 0.13 dependency.

---

## Step C: Collapse CI, registry verification, and release automation

### Status

`review`

### Objective

Make local and remote gates consume and verify the same single bundled CLI tarball.

### Tasks

- [x] Update six-platform CI smoke wording and behavior to pack/install only the bundled CLI tarball.
- [x] Update registry verification to compare one artifact's integrity/metadata and accept the required initial `latest` tag pointing to beta.2.
- [x] Replace four-package staged publication automation with a guarded direct-tarball bootstrap workflow or documented manual publication boundary consistent with `--provenance=false`.
- [x] Preserve protected canaries, draft prerelease assets, checksums, SBOM, attestations, six-platform anonymous registry-install verification, and GitHub publication ordering.
- [x] Add installed-tree checks for the three embedded package roots and `npm ls --global --all`.

### Relevant Files

- `.github/workflows/ci.yml`
- `.github/workflows/release-tag.yml`
- `.github/workflows/promote-release.yml`
- `scripts/ci-package-smoke.mjs`
- `scripts/verify-npm-release.mjs`
- `scripts/verify-registry-install.mjs`
- `scripts/verify-draft-release.mjs`

### Expected Changes

- modify: CI and promotion workflows
- modify: local and registry install smoke tests
- modify: one-package metadata/integrity verification

### Do Not Modify

- Six supported OS/architecture entries
- Canonical repository guards
- Requirement that GitHub prerelease publication follows every registry-install success
- Secret handling or canary authorization boundaries

### Commands

```bash
node --test scripts/release-policy.test.mjs scripts/verify-draft-release.test.mjs
node scripts/ci-package-smoke.mjs
npm run check:beta-readiness
```

### Acceptance Criteria

- [ ] All six CI platforms install the same bundled tarball and fetch no internal AdRouter package.
- [x] Both commands, version/help, profile listing, JSON doctor, offline model listing, resources, embedded packages, and dependency tree are verified.
- [x] Registry verification requires beta and initial latest to resolve to beta.2 and matches recorded integrity.
- [x] GitHub prerelease remains draft until the six-platform anonymous registry-install matrix succeeds.
- [x] Bootstrap provenance omission is explicit and later trusted publishing remains documented.

### Validation Results

- `node --test scripts/release-policy.test.mjs scripts/verify-draft-release.test.mjs`: passed
- `node scripts/ci-package-smoke.mjs`: passed locally with an isolated global prefix
- `npm run check:beta-readiness`: passed

### Findings / Notes

- The current promotion workflow depends on npm staged publishing and OIDC for four packages; beta.2 requires a user-authenticated direct first publication instead.
- Workflow implementation is complete; the remote six-platform runs remain gated on push.

---

## Step D: Update release and installation documentation

### Status

`done`

### Objective

Document the exact beta.2 single-artifact sequence, authentication pause, immutable failure recovery, and later trusted-publisher setup.

### Tasks

- [x] Replace four-package/publication-order language with one CLI artifact.
- [x] Document clean-tag rebuild, recorded SHA-512 integrity, isolated global-install smoke, `npm whoami`, registry/scope/version preflight, and exact publish command.
- [x] Document polling, anonymous install, beta/latest expectations, six-platform registry verification, credential logout/revocation, and trusted-publisher follow-up.
- [x] Preserve tester guidance to install `@beta` and document beta.3 recovery rather than overwriting beta.2.

### Relevant Files

- `README.md`
- `docs/releasing.md`
- `docs/installation.md`
- `docs/development.md`
- `docs/incidents.md`
- package changelogs

### Expected Changes

- modify: release, install, incident, and version documentation

### Do Not Modify

- Hosted-access policy or beta-key requirements
- Historical evidence for beta.1
- Standalone native archive blocked status

### Commands

```bash
npm run check:docs
rg 'all four|four packages|dependency order|0\.81\.0-beta\.1' README.md docs packages/*/docs
```

### Acceptance Criteria

- [x] Public installation guidance remains `npm install --global --ignore-scripts @adrouter/cli@beta`.
- [x] Documentation publishes only the recorded CLI tarball and never instructs publishing internals.
- [x] Initial beta/latest behavior and later trusted publishing are explicit.
- [x] Defective beta.2 recovery requires deprecation and beta.3.

### Validation Results

- `npm run check:docs`: passed
- `rg 'all four|four packages|dependency order|0\.81\.0-beta\.1' README.md docs packages/*/docs`: passed for current release material

### Findings / Notes

- Current release documentation explicitly mandates publishing all four packages in dependency order and must be rewritten.

---

## Step E: Final verification and cleanup

### Status

`done`

### Objective

Prove the local beta.2 artifact and leave the repository ready for review, push, CI, tagging, and the user-authenticated deployment sequence.

### Tasks

- [x] Run the full build, static checks, isolated tests, beta-readiness checks, policy tests, and bundled tarball install smoke.
- [x] Inspect the packed file inventory, size, SHA-512 integrity, declared bundled dependency tree, licenses, and runtime resources.
- [x] Verify `adrouter` and `adrouter-profile` behaviors and `npm ls --global --all`.
- [x] Scan the final artifact and diff for secrets, local paths, executable payloads, stale four-package assumptions, unintended files, and temporary debug output.
- [x] Record passed commands, deviations, artifact location/integrity, remaining remote gates, and trusted-publisher follow-up.

### Relevant Files

- all modified release, manifest, policy, workflow, test, and documentation files
- staged `@adrouter/cli-0.81.0-beta.2.tgz` outside the repository

### Expected Changes

- modify: `PLAN.md` validation results and statuses
- no additional production files unless a failing validation requires a scoped fix

### Do Not Modify

- Git history, remote branches, immutable tags, npm registry state, GitHub release state, or credentials
- Unrelated source behavior

### Commands

```bash
npm run build
npm run check
npm run test:isolated
npm run check:beta-readiness
node scripts/ci-package-smoke.mjs
git diff --check
git status --short
```

### Acceptance Criteria

- [x] All required local commands pass.
- [x] The isolated tarball installation proves the full command/resource/embedded-package/dependency-tree contract.
- [x] No internal package is fetched from npm.
- [x] The final diff is scoped and free of credentials, local paths, native executable payloads, and stale current-release references.
- [x] Remaining remote steps are clearly separated and await the required user authentication or CI results.

### Validation Results

- `npm run build`: passed
- `npm run check`: passed
- `npm run test:isolated`: passed (72 AI files, 16 agent-core files, and 167 CLI files; TUI node tests also passed)
- `npm run check:beta-readiness`: passed
- `node scripts/ci-package-smoke.mjs`: passed, including global install and `npm ls --global --all`
- `git diff --check`: passed
- `git status --short`: reviewed; only release-scope changes and `PLAN.md` are present

### Findings / Notes

- Remote publication, tag creation, CI monitoring, canaries, GitHub prerelease publication, credential revocation, and trusted-publisher configuration remain separate gated actions after local acceptance.
- Local implementation acceptance is complete. Final verification remains in review until the release commit is pushed and the six-platform CI matrix passes.

---

## Follow-up Work

- Push the reviewed release commit and require the existing six-platform CI matrix.
- Create and push immutable `v0.81.0-beta.2` only after CI passes, then inspect the tag workflow's canaries and draft prerelease assets.
- Rebuild from a clean checkout of the exact tag, record integrity, and repeat global-install smoke.
- Pause for user npm/GitHub authentication and any OTP/account verification before registry mutation.
- After beta.2 succeeds, configure npm trusted publishing for subsequent provenance-enabled releases.
- Defer package-size optimization and internal-module flattening.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-07-24 | Use one public CLI artifact with three exact-version bundled private workspaces | Preserves module boundaries while avoiding unpublished internal registry dependencies and workspace symlink packing | Release policy, artifact construction, CI, verification, and docs collapse from four public packages to one |
| 2026-07-24 | Keep remote mutation outside local implementation until the artifact and six-platform gates are proven | Tagging and npm publication are immutable or externally visible and require user authentication | Local work can be fully validated without risking a partial release |
| 2026-07-24 | Use official npm documentation as fallback research | Required Context7 tools were unavailable and the current-docs index lacked npm | Plan relies on primary npm sources and records the tooling limitation |
