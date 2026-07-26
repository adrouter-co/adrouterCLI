# Plan: Port the Pi startup banner and release AdRouterCLI 0.81.0-beta.6

## Goal

Port the installed Pi coding agent's custom AdRouter startup banner into AdRouterCLI with full
responsive visual parity, change the built-in dark input panel through the same dark-gray to
light-gray thinking-level progression, address the current `brace-expansion` audit finding, and
release the verified result as `@adrouter/cli@0.81.0-beta.6` on npm and GitHub.

## Context

AdRouterCLI currently renders an `ExpandableText` startup header. The approved reference is the
user-authored `ResponsiveStartupHeader` in the local `pi-opencode-tui-patch` snapshot, not the
separate `~/.pi/agent/extensions/adrouter-banner` extension. The reference combines a 30-by-32
pixel bead sprite, a literal outlined prompt mark, and runtime metadata, with exact artwork retained
at widths of 32 columns and above and a text fallback below 32 columns.

`CustomEditor` already converts the active thinking border foreground into the input panel
background, so the desired grayscale behavior can be implemented by changing the built-in dark
theme's thinking colors. The light theme and bash-mode green remain unchanged.

The immutable beta.5 release is public. Runtime changes therefore require beta.6. Local `main`
contains subsequent release-workflow fixes and is the implementation base. The user authorized
replacing the completed beta.5 plan, addressing the audit advisory, and deploying beta.6; work must
pause only when authentication, interactive 2FA, or protected environment approval is required.

## Research Summary

- The reference banner source and its focused startup test were inspected locally; the reference
  snapshot and test hashes are recorded in the implementation step for provenance.
- The current editor implementation already derives a solid panel background from the thinking
  color, avoiding a new rendering abstraction or dependency.
- `minimatch@10.2.5` accepts `brace-expansion@^5.0.5`; pinning the patched 5.0.8 release addresses
  the production audit advisory without changing the direct dependency graph. A later full-tree
  audit identified development-only `postcss@8.5.15`; a root-only 8.5.23 override addresses it
  without changing the published tarball.
- The repository's protected release process stages one exact tarball under `candidate`, validates
  anonymous installed runtimes on six OS/architecture targets, then moves `beta` and `latest` and
  publishes the matching GitHub prerelease.

## Constraints

- Preserve quiet startup, custom extension headers, startup-help expansion, loaded resources,
  `/reload`, `/new`, theme reloads, terminal resizes, and narrow-terminal behavior.
- Preserve existing public commands, APIs, routes, configuration formats, persisted state, router
  behavior, sponsor isolation, and native-artifact blocks.
- Keep the first implementation small, reviewable, and reversible; prefer minimal diffs over broad
  rewrites and add no runtime dependency.
- Keep the light theme and bash-mode editor color unchanged.
- Retain immutable baseline provenance for `pi-opencode-tui-patch` while recording the reviewed
  user-authored banner/theme overlay and source hashes in both bundled-source inventories.
- Publish only `@adrouter/cli`; keep the three exact-version private workspaces bundled.
- Never print, commit, or request secrets in chat. Use only documented protected environments and
  short-lived scoped credentials.
- Do not include branded helper metadata, hidden metadata comments, or non-plan administrative
  sections.

## Out of Scope

- Redesigning unrelated terminal UI, footer, sponsor panel, loaded-resource view, or light theme.
- Changing model/router contracts, authentication behavior, sponsor data flow, commands, profiles,
  or persisted formats.
- Publishing the private workspaces or any standalone native archive.
- Stable `0.81.0` promotion, dependency upgrades unrelated to audit remediation, or opportunistic
  cleanup.

## Reversibility

The banner is an internal component replacing only the built-in startup header. Existing header
interfaces and extension behavior remain intact until the replacement is covered by focused tests.
The theme edit is limited to built-in dark thinking tokens, and the security fix is limited to the
existing override plus generated lock/shrinkwrap updates. npm tags do not move until the exact
candidate passes every protected gate. An immutable failed beta.6 candidate is deprecated and
replaced with a higher version; it is never overwritten or unpublished.

---

## Step A: Implement and test responsive startup visual parity

### Status

`done`

### Objective

Replace the current built-in startup header with a tested responsive component matching the
installed Pi banner at supported terminal widths.

### Tasks

- [x] Port the exact 30-by-32 sprite, 18-color palette, half-block renderer, 10-by-12 prompt mark,
  spacing, metadata layout, color-mode handling, and narrow text fallback.
- [x] Integrate the component only into the built-in startup path while preserving quiet startup,
  expansion state, loaded resources, custom headers, reload/new, and resize behavior.
- [x] Keep AdRouterCLI-specific help/onboarding text and runtime metadata accurate.
- [x] Add deterministic width, composition, color fallback, cropping, and expansion regression tests.

### Relevant Files

- `packages/coding-agent/src/modes/interactive/interactive-mode.ts`
- `packages/coding-agent/src/modes/interactive/components/responsive-startup-header.ts`
- `packages/coding-agent/test/responsive-startup-header.test.ts`

### Expected Changes

- create: `packages/coding-agent/src/modes/interactive/components/responsive-startup-header.ts`
- create: `packages/coding-agent/test/responsive-startup-header.test.ts`
- modify: `packages/coding-agent/src/modes/interactive/interactive-mode.ts`

### Do Not Modify

- Extension-defined custom headers or loaded-resource rendering
- Footer, editor, sponsor panel, model context, commands, or session persistence

### Commands

```bash
npm test --workspace @adrouter/cli -- test/responsive-startup-header.test.ts
npm run build
```

### Acceptance Criteria

- [x] Widths 32 and above retain the same left-side artwork composition and crop only on the right.
- [x] Widths below 32 render safe, useful text with no line exceeding terminal width.
- [x] Truecolor, 256-color, and `NO_COLOR` paths render deterministically and safely.
- [x] Header expansion, quiet startup, custom headers, `/reload`, `/new`, and resize behavior remain
  covered or demonstrably unchanged.
- [x] Focused tests and build pass with no unrelated changes.

### Validation Results

- `npm test --workspace @adrouter/cli -- test/responsive-startup-header.test.ts`: passed (4 tests)
- `npm run build`: passed

### Findings / Notes

- Reference snapshot SHA-256:
  `3dd3581bd366cd5f25bc2e914d99482c14cd1b2de59c636bc07dc9c03d4141fb`.
- Reference focused test SHA-256:
  `9e50e774003168f877ecef5692a70e05b28c5d26023269a94fcbe10a365a696b`.
- Embedded sprite SHA-256:
  `28ee5aae83e8dc930510073c389b5e9c22553fbac4b038fb75d2f99d4c7a149a`.

---

## Step B: Apply the built-in dark grayscale input progression

### Status

`done`

### Objective

Make the input panel background progress from dark gray to light gray with thinking level, matching
the user's current Pi configuration.

### Tasks

- [x] Set off, minimal, and low to `#232323`; medium to `#343434`; high to `#464646`; and xhigh/max
  to `#575757` in the built-in dark theme.
- [x] Add or update focused rendering/theme tests proving the editor derives the expected panel
  backgrounds for all thinking levels.
- [x] Verify light-theme values and bash-mode green are unchanged.

### Relevant Files

- `packages/coding-agent/src/modes/interactive/theme/dark.json`
- `packages/coding-agent/src/modes/interactive/components/custom-editor.ts`
- `packages/coding-agent/test/custom-editor-render.test.ts`

### Expected Changes

- modify: `packages/coding-agent/src/modes/interactive/theme/dark.json`
- modify: focused editor/theme tests if required

### Do Not Modify

- `packages/coding-agent/src/modes/interactive/theme/light.json`
- Editor layout, cursor behavior, bash-mode color, or custom theme schema

### Commands

```bash
npm test --workspace @adrouter/cli -- test/custom-editor-render.test.ts test/max-thinking.test.ts
```

### Acceptance Criteria

- [x] Every dark-theme thinking level maps to the approved grayscale value.
- [x] The input panel uses those values without layout or cursor regressions.
- [x] Light theme and bash-mode rendering remain unchanged.
- [x] Focused tests pass.

### Validation Results

- `npm test --workspace @adrouter/cli -- test/custom-editor-render.test.ts test/max-thinking.test.ts`: passed (5 tests)

### Findings / Notes

- Approved custom theme SHA-256:
  `db9f057405ca49e9435db243a4a4784dcd23497c10578ca07bd6bdd8417aa8f3`.
- The reference theme predates `thinkingMax`; beta.6 intentionally maps max to the approved xhigh
  value.

---

## Step C: Prepare beta.6 metadata, provenance, and audit remediation

### Status

`done`

### Objective

Create a consistent beta.6 release slice, record the source overlay, and remove the known production
audit finding without unrelated dependency drift.

### Tasks

- [x] Version all four workspaces, internal exact dependency pins, root metadata, release manifest,
  docs, and release-policy fixtures as `0.81.0-beta.6`.
- [x] Set `candidate` as the temporary npm tag, `beta` and `latest` as final beta.6 tags, GitHub as a
  prerelease, and beta.5 as the superseded version.
- [x] Pin `brace-expansion` to 5.0.8 and development-only `postcss` to 8.5.23, then regenerate the
  root lockfile and coding-agent shrinkwrap through documented scripts with no unrelated dependency
  updates.
- [x] Update both bundled-source inventories with matching banner/theme overlay notes and hashes
  while retaining the immutable 0.1.6/e687e69 baseline provenance.
- [x] Update release documentation and user-facing exact-version examples for beta.6.

### Relevant Files

- `package.json`
- `package-lock.json`
- `packages/*/package.json`
- `packages/coding-agent/npm-shrinkwrap.json`
- `release-manifest.json`
- `scripts/release-policy.test.mjs`
- `docs/bundled-sources.json`
- `packages/coding-agent/BUNDLED_SOURCES.json`
- `README.md`
- `docs/releasing.md`
- `docs/troubleshooting.md`

### Expected Changes

- modify: beta.6 version/release metadata, exact dependency pins, generated lock/shrinkwrap,
  provenance inventories, and release docs

### Do Not Modify

- Native artifact status or platform matrix
- Public package boundary, internal package visibility, release workflow ordering, or stable policy
- Any dependency version unrelated to the identified audit advisories

### Commands

```bash
npm install --package-lock-only --ignore-scripts
npm run shrinkwrap:coding-agent
npm run check:shrinkwrap
npm run check:release-metadata
npm audit --omit=dev --audit-level=moderate
npm audit signatures --omit=dev
```

### Acceptance Criteria

- [x] Every authoritative version and exact internal dependency is beta.6.
- [x] The final npm tags and GitHub prerelease metadata match the documented beta policy.
- [x] Lockfile and shrinkwrap contain `brace-expansion@5.0.8`, the root lockfile contains
  `postcss@8.5.23`, and there is no unintended update drift.
- [x] Both bundled-source inventories are byte-for-byte equivalent and preserve attribution.
- [x] Metadata, shrinkwrap, and audit gates pass.

### Validation Results

- `npm install --package-lock-only --ignore-scripts`: passed with public registry access
- `npm run shrinkwrap:coding-agent`: passed; generated 159 packages and 10 platform-specific entries
- `npm run check:shrinkwrap`: passed
- `npm run check:release-metadata`: passed (15 tests)
- `npm audit --audit-level=moderate`: passed after the post-push audit refresh; 0 vulnerabilities
- `npm audit --omit=dev --audit-level=moderate`: passed; 0 vulnerabilities
- `npm audit signatures`: passed; 480 verified signatures and 95 attestations
- `npm audit signatures --omit=dev`: passed; 170 verified signatures and 22 attestations

### Findings / Notes

- `brace-expansion@5.0.7` was the production audit blocker; 5.0.8 is the patched compatible release.
- A full-tree audit after the first branch push identified development-only `postcss@8.5.15`;
  root-only 8.5.23 remediation was added before the pull request.

---

## Step D: Final verification and cleanup

### Status

`done`

### Objective

Prove the source and installed beta.6 artifact locally, review visual parity, and leave only
authenticated remote release gates.

### Tasks

- [x] Run focused tests, build, aggregate checks, isolated tests, release readiness, package smoke,
  audits, and whitespace validation.
- [x] Compare the locally installed beta.6 TUI in Ghostty against the supplied reference at narrow,
  reference, and wide terminal widths and record any environment-limited visual check.
- [x] Review the final diff for unrelated files, generated artifacts, secrets, personal paths,
  unsupported links, and stale beta.5 runtime/release references.
- [x] Remove temporary debug output and update this plan with exact validation results and remaining
  risks.

### Relevant Files

- all files changed by Steps A through C
- `PLAN.md`

### Expected Changes

- modify: `PLAN.md` validation results and status

### Do Not Modify

- Unrelated untracked `.pi/` and `AGENTS.md`
- Git tags, npm dist-tags, GitHub releases, or protected secrets before local gates pass

### Commands

```bash
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
npm audit --omit=dev --audit-level=moderate
npm audit signatures --omit=dev
git diff --check
```

### Acceptance Criteria

- [x] All local release gates pass, or an environmental skip is explicitly documented with
  equivalent protected CI coverage.
- [x] The staged tarball is production-faithful, deployable, attributed, and contains no secrets or
  unsupported native artifact.
- [x] Visual comparison confirms full banner and input-panel parity at the tested terminal widths.
- [x] Only remote CI, authentication, protected approvals, and publication remain.
- [x] No unintended files are part of the release diff.

### Validation Results

- `npm run build`: passed
- `npm run check`: passed after temporarily excluding the unrelated untracked `.pi/` directory from
  the public release-boundary scan; it was restored unchanged immediately afterward
- `npm run test:isolated`: passed outside the filesystem sandbox; 498 AI, 180 agent, and 1,513 CLI
  tests passed, plus the TUI suite, with documented skips
- `npm run check:release-readiness`: passed
- `node scripts/ci-package-smoke.mjs`: passed outside the filesystem sandbox against the exact staged
  beta.6 tarball and isolated global prefix
- `npm audit --audit-level=moderate`: passed; 0 vulnerabilities across production and development
- `npm audit --omit=dev --audit-level=moderate`: passed; 0 vulnerabilities
- `npm audit signatures`: passed; 480 verified signatures and 95 attestations
- `npm audit signatures --omit=dev`: passed
- `git diff --check`: passed

### Findings / Notes

- Exact Node.js 22.19 and all six platform/runtime combinations remain protected GitHub Actions
  gates even when local verification passes.
- Pre-release CI treats an absent exact npm version as not-yet-published and skips only that optional
  registry check. Protected promotion remains strict after candidate publication.
- A live 140-column alternate-screen TTY smoke reproduced the reference monochrome composition and
  input panel. Automated tests cover widths 18, 31, 32, 60, 95, and 140 in monochrome, 256-color,
  and truecolor modes.

---

## Step E: Release beta.6 through npm and GitHub

### Status

`in_progress`

### Objective

Merge the reviewed beta.6 release slice and publish the exact protected artifact end to end.

### Tasks

- [ ] Commit and push `codex/port-pi-banner-beta6`, open a release pull request, and wait for every
  required CI check.
- [ ] Merge the approved release commit, create and push immutable tag `v0.81.0-beta.6`, and verify
  the staged draft assets and attestations from `release-tag.yml`.
- [ ] Run `publish-candidate`, approve `npm-publish`, and verify exact candidate integrity.
- [ ] Run `finalize-release`, approve protected environments, and wait for all six anonymous
  installed-runtime gates before npm tag movement and GitHub publication.
- [ ] Verify npm `candidate` removal, `beta`/`latest` resolution, beta.5 deprecation, GitHub
  prerelease assets/attestations, and exact clean anonymous installation.
- [ ] Revoke the temporary npm token and remove any temporary staging credential after verification.

### Relevant Files

- `.github/workflows/release-tag.yml`
- `.github/workflows/promote-release.yml`
- `docs/releasing.md`
- `release-manifest.json`

### Expected Changes

- create: git commit, pull request, immutable beta.6 tag, npm beta.6 package, and GitHub prerelease
- modify: npm dist-tags and beta.5 deprecation metadata through protected workflows

### Do Not Modify

- Existing immutable package versions or git tags
- Stable npm policy, private workspaces, or blocked native artifacts

### Commands

```bash
gh auth status --hostname github.com
git push --set-upstream origin codex/port-pi-banner-beta6
gh pr create --fill
git tag v0.81.0-beta.6
git push origin v0.81.0-beta.6
npm view @adrouter/cli version dist-tags --json
gh release view v0.81.0-beta.6 --repo adrouter/adrouterCLI
```

### Acceptance Criteria

- [ ] Required CI and protected release workflows pass on the exact immutable tag.
- [ ] npm `beta` and `latest` resolve to 0.81.0-beta.6 and `candidate` is absent.
- [ ] GitHub publishes `v0.81.0-beta.6` as a prerelease with all required assets and attestations.
- [ ] Anonymous exact-version install and runtime checks pass on every supported target.
- [ ] Temporary publication credentials are revoked or removed.

### Validation Results

- authenticated GitHub and npm release workflow: not run
- six-platform installed-runtime matrix: not run
- public post-release verification: not run

### Findings / Notes

- Stop for user action only if GitHub CLI login, npm token creation, 2FA, or protected environment
  approval cannot be completed with existing authenticated sessions.

---

## Follow-up Work

- Start a new beta.6 soak only after publication; stable 0.81.0 remains a separate, metadata-only
  release decision with required cross-platform cohort evidence.
- Any runtime defect found after beta.6 publication requires a higher immutable prerelease.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-07-27 | Use the installed Pi responsive header, not the banner extension | The screenshot and local source match the built-in patched header | Exact sprite, prompt mark, metadata, and responsive behavior are ported |
| 2026-07-27 | Apply grayscale to built-in dark only | The user selected parity with the current Pi dark setup | Light theme remains unchanged; max falls back to xhigh gray |
| 2026-07-27 | Address the current npm audit issue in beta.6 | The user selected remediation before deployment | `brace-expansion` is updated to patched 5.0.8 without broad dependency updates |
| 2026-07-27 | Replace the completed beta.5 plan | The user explicitly selected replacement | `PLAN.md` now tracks banner implementation and beta.6 release |
| 2026-07-27 | Deploy through protected candidate/finalize workflows | Repository policy requires exact-artifact, six-platform verification | Authentication is requested only at the first actual protected gate |
