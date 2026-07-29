# Plan: Release AdRouterCLI 0.81.0-beta.11 with the TUI refresh

## Goal

Port the intended TUI refresh onto the current public main branch, retain the public-beta blue `❯`
input prompt, and publish the exact reviewed package as `@adrouter/cli@0.81.0-beta.11` to npm
`beta`/`latest` and as a GitHub prerelease.

## Context

- The public baseline is `0.81.0-beta.10`; npm `beta` and `latest` both resolve to it and GitHub
  `main` is `8798e6dcba114a4ccdb5b002582226e15a405e5f`.
- The intended TUI edits exist in a dirty checkout based on beta.6. They must be ported selectively
  onto current `main`, not published or copied wholesale.
- Beta.11 is unused on npm and GitHub as of 2026-07-29.
- The source workspaces version in lockstep, but only `@adrouter/cli` is public.

## Research Summary

- `docs/releasing.md`, the release manifest, and protected workflows require an exact immutable
  candidate, two-cohort authentication acceptance, six anonymous installed-runtime jobs, and only
  then movement of npm `beta`/`latest` plus publication of the GitHub prerelease.
- Current public beta uses `panelColor("border", "❯ ")`; this exact blue prompt must remain.
- The old dirty tree predates beta.8-beta.10 runtime behavior, including context recovery and
  transcript-selection input yielding, so visual changes must preserve current-main logic.

## Constraints

- Preserve user-owned `.pi/` and all unrelated dirty-checkout changes by working in a clean worktree.
- Preserve public commands, configuration, authentication, server contracts, persisted state,
  sponsor isolation, trust, approvals, and current-main runtime behavior.
- Use Node.js 22.19 or newer and the documented release workflow.
- Introduce no new dependencies and make only the requested TUI, test, plan, and release-metadata
  changes.
- Publish under `candidate` first; do not move `beta` or `latest` before every protected gate passes.
- Never reuse, overwrite, retag, or unpublish an immutable version.

## Out of Scope

- Stable `0.81.0`, native standalone archives, backend deployment, or another client release.
- API, authentication, command, configuration, storage, or dependency changes.
- Unrelated UI redesign or opportunistic cleanup.

## Reversibility

- Keep the TUI and release metadata changes reviewable on branches based on current `main`.
- Before npm publication, revert or amend through ordinary pull-request changes.
- After candidate publication, fix forward with the next unused beta and leave public channels on
  beta.10 if acceptance fails.

---

## Step A: Port the TUI refresh onto current main

### Status

`done`

### Objective

Recreate the intended responsive TUI presentation while preserving every current-main behavior.

### Tasks

- [x] Port the metadata footer, path formatting, input framing, consistent key hints, sponsor panel,
      selectors, dialogs, loader, and responsive startup-header changes.
- [x] Keep the input prompt as the public-beta blue `❯` and preserve continuation-row alignment.
- [x] Preserve transcript-selection yielding and all beta.8-beta.10 runtime behavior.
- [x] Add or update focused rendering, width, path, hint, sponsor, and selector tests.

### Relevant Files

- `packages/coding-agent/src/modes/interactive/components/`
- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/test/`

### Expected Changes

- create: `packages/coding-agent/src/modes/interactive/components/path-display.ts`
- create: focused path and keybinding-hint tests
- modify: TUI components and focused tests

### Do Not Modify

- Authentication, provider transport, commands, tools, sessions, persisted formats, or sponsor data
  boundaries.
- Private local state such as `.pi/`.

### Commands

```bash
npm test --workspace @adrouter/cli -- test/custom-editor-render.test.ts test/footer-width.test.ts test/adrouter-ad-panel.test.ts test/keybinding-hints.test.ts test/path-display.test.ts test/responsive-startup-header.test.ts test/session-selector-rename.test.ts
npm run check
```

### Acceptance Criteria

- [x] The input begins with the blue Unicode `❯` used by beta.10.
- [x] Layout remains within narrow terminal widths and path rendering handles Unix and Windows paths.
- [x] Current-main transcript-selection input behavior is retained.
- [x] Focused tests and the normal repository check pass.
- [x] No unintended files are changed.

### Validation Results

- Focused tests: passed 7 files and 32 tests on 2026-07-29.
- `npm run check`: passed on 2026-07-29.

### Findings / Notes

- The earlier dirty tree's focused tests passed 26 tests, but that stale baseline is not release
  evidence.
- The port preserves current-main transcript-selection yielding and all non-visual runtime paths.

---

## Step B: Review and merge the implementation

### Status

`in_progress`

### Objective

Land the TUI refresh through a reviewed feature pull request with the required platform CI.

### Tasks

- [x] Review the complete diff for stale-baseline regressions and generated/private files.
- [ ] Commit and push the feature branch, open a pull request, and wait for required CI.
- [ ] Merge only after all required checks pass.

### Relevant Files

- `.github/workflows/ci.yml`
- TUI files and tests listed in Step A

### Expected Changes

- modify: Git history through the reviewed feature pull request

### Do Not Modify

- Protected workflows or repository secrets unless a verified release blocker requires it.

### Commands

```bash
git diff --check
git status --short
gh pr checks --watch
```

### Acceptance Criteria

- [ ] The feature pull request is reviewed and merged into current `main`.
- [ ] Required six-platform CI is green.
- [ ] The merged source contains the public-beta blue `❯` and all intended TUI tests.

### Validation Results

- Feature PR checks: not run.

### Findings / Notes

- None yet.

---

## Step C: Prepare and tag the immutable beta.11 release

### Status

`todo`

### Objective

Create and merge a metadata-only release change, then tag its exact commit.

### Tasks

- [ ] Recheck that beta.11 is unused across npm, Git refs, releases, and workflow state.
- [ ] Synchronize all workspace versions, lock/shrinkwrap output, manifest, README, and changelogs
      using repository release tooling.
- [ ] Set candidate and final npm tags so accepted beta.11 replaces beta.10 on `beta` and `latest`.
- [ ] Run clean-checkout release gates on Node.js 22.19+, merge the release PR, and tag its exact
      merged commit as `v0.81.0-beta.11`.
- [ ] Verify `release-tag.yml` creates and attests the exact draft GitHub prerelease artifacts.

### Relevant Files

- `package.json`
- `packages/*/package.json`
- `package-lock.json`
- `packages/coding-agent/npm-shrinkwrap.json`
- `release-manifest.json`
- `README.md`
- `CHANGELOG.md`
- `packages/*/CHANGELOG.md`

### Expected Changes

- modify: version and release metadata only

### Do Not Modify

- Runtime source after the accepted feature merge.
- Used npm versions, tags, or GitHub releases.

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

- [ ] All four workspaces and generated release metadata agree on beta.11.
- [ ] Every pre-tag gate passes from a clean Node.js 22.19+ checkout.
- [ ] The release PR is merged and its exact commit is tagged once.
- [ ] The draft prerelease contains the exact attested staged tarball and required assets.

### Validation Results

- Clean release gates: not run.
- Tag workflow: not run.

### Findings / Notes

- If beta.11 becomes occupied before tagging, select and record the lowest unused higher beta.

---

## Step D: Final verification and cleanup

### Status

`todo`

### Objective

Promote the exact candidate through authentication acceptance and six-platform verification, then
verify public npm/GitHub state and remove temporary credentials.

### Tasks

- [ ] Confirm protected environments and a short-lived package-scoped `NPM_TOKEN` are ready.
- [ ] Run `publish-candidate` and verify exact npm metadata and integrity without moving final tags.
- [ ] Complete and upload redacted authentication acceptance on two distinct OS/architecture cohorts.
- [ ] Run `finalize-release`, approve protected deployments, and require all six anonymous runtime
      jobs before channel movement.
- [ ] Verify npm `beta` and `latest`, removal of `candidate`, deprecation of beta.10, and the public
      GitHub prerelease/assets/attestations.
- [ ] Revoke the temporary npm token, delete the environment secret, review the final diff/state,
      and record remaining risks.

### Relevant Files

- `.github/workflows/release-tag.yml`
- `.github/workflows/promote-release.yml`
- `release-manifest.json`
- redacted `authentication-acceptance.json` release asset

### Expected Changes

- modify: external npm dist-tags/deprecation and GitHub prerelease state through protected workflows
- delete: temporary npm environment secret after successful verification

### Do Not Modify

- Published tarball contents or integrity.
- Credential-bearing local files or logs.

### Commands

```bash
npm view @adrouter/cli@0.81.0-beta.11 version dist.integrity dist.tarball --json
npm view @adrouter/cli dist-tags --json
gh release view v0.81.0-beta.11 --repo adrouter/adrouterCLI
```

### Acceptance Criteria

- [ ] The exact accepted beta.11 tarball is on npm `beta` and `latest`; `candidate` is absent.
- [ ] Six installed-runtime jobs and both authentication cohorts pass.
- [ ] GitHub beta.11 is a public prerelease with complete verified assets and attestations.
- [ ] Temporary credentials are revoked and removed without exposing their values.
- [ ] No release blocker remains; follow-up monitoring is recorded.

### Validation Results

- Candidate promotion: not run.
- Authentication acceptance: not run.
- Final promotion and public verification: not run.

### Findings / Notes

- None yet.

---

## Follow-up Work

- Monitor beta.11 for packaging, authentication, rendering, and upgrade regressions during its soak.
- Promote a stable release only after the documented beta soak and cross-platform packaged-user runs.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-07-29 | Release as `0.81.0-beta.11` | Beta.10 is public and beta.11 is unused. | New immutable prerelease. |
| 2026-07-29 | Preserve the public beta blue `❯` | The user explicitly selected the current public-beta arrow. | Input prompt remains familiar and tested. |
| 2026-07-29 | Port onto current `main` in a clean worktree | The dirty implementation branch predates beta.8-beta.10. | Avoids stale runtime regressions and preserves user files. |
| 2026-07-29 | Promote through `candidate` before `beta`/`latest` | Required by release policy and immutable recovery rules. | Final channels move only after exact-package acceptance. |
