# Plan: AdRouterCLI Platform-Access Beta Rollout

## Goal

Finish clean-checkout release verification for the implemented installation-bound authentication,
publish an immutable `@adrouter/cli` beta candidate, accept the exact installed package on two
systems against staging, and promote that beta without rebuilding.

## Context

- This is the independent `adrouter/adrouterCLI` repository. Four workspaces version in lockstep;
  only `@adrouter/cli` is public.
- Source and public baseline are `0.81.0-beta.6`. Public npm/GitHub state was last verified on
  2026-07-27 with `beta` and `latest` on beta.6.
- Use `0.81.0-beta.7` only if a fresh npm/Git/GitHub check shows the package version, tag,
  release, draft, and workflow identity are unused.
- Installation storage, user-approved enrollment, exact-byte DPoP signing, refresh coordination,
  sign-out, diagnostics, protected headers, canonical fixture, acceptance schema, and
  credential-free release workflows are implemented in the current dirty worktree.
- Router and CLI share fixture SHA-256
  `93a8ec8d4eba38f9165179aa0cdfe3316f8134a882bd0426bd83339af55d17f8`.
- Focused auth tests and full source tests passed on 2026-07-27. The current-worktree
  `npm run check` fails only because user-owned untracked `.pi/.profile-active.json` contains a
  development path caught by the public-boundary scan.
- Do not delete, modify, hide, or commit `.pi/`. Final release evidence must come from a clean clone
  of the reviewed release commit where unrelated files are absent.
- The Router/WebUI staging deployment must accept the frozen contract in observe mode before manual
  candidate acceptance.
- This plan ends at beta publication. Stable release, native archives, production Router policy, and
  OpenCode are out of scope.

## Research Summary

- The repository's `docs/releasing.md`, `release-manifest.json`,
  `release-tag.yml`, and `promote-release.yml` define the release path.
- `scripts/release.mjs` requires a clean tree and `ADROUTER_CHANGELOG_AUDITED=1`; for an explicit
  version it synchronizes all workspaces, updates changelogs/artifacts, runs checks/tests, commits,
  tags, pushes main, and pushes the tag.
- Tag push builds one exact tarball, manifest, SBOM, bundled-source inventory, notices, checksums,
  attestations, and a draft GitHub prerelease.
- Promotion is already split into `publish-candidate` and `finalize-release`. Finalization
  requires a matching sanitized `authentication-acceptance.json` and six anonymous
  OS/architecture installed-runtime jobs.
- Current repository policy uses a fresh package-scoped `NPM_TOKEN` in protected
  `npm-publish` for candidate publication and dist-tag changes. Keep it valid for at most seven
  days and revoke it after verification.
- The acceptance validator requires one exact npm tarball/integrity, `file_protected` storage, a
  primary operator cohort, and a distinct OS/architecture cohort.

## Constraints

- Use Node.js `>=22.19.0`, npm workspaces, and the existing lockfile/pin policy.
- Preserve workspace trust, command approvals, session/tool behavior, stream order, cancellation,
  no partial-stream replay, and sponsor metadata separation.
- Keep access tokens memory-only and installation private/refresh state in the existing locked
  user-only auth store, honestly classified `file_protected`.
- Never print or package a private JWK, access/refresh token, device code, nonce, proof,
  Authorization header, auth-file content, prompt, response, or full fingerprint.
- Official hosted origins use installation auth. Bearer compatibility remains only for explicit
  loopback/non-official custom routers and cannot override hosted auth.
- Never publish private workspaces separately or claim standalone native archives.
- Candidate/final release artifacts, versions, and tags are immutable; fix forward with a higher
  beta.
- Release/tag/publish/upload/dist-tag/secret actions require explicit authorization.
- Preserve user-owned `.pi/`, `AGENTS.md`, and all unrelated dirty/untracked work.

## Out of Scope

- Source redesign beyond a defect found by clean or exact-candidate validation.
- Stable `0.81.0`, 48-hour stable soak, or bundled native archives.
- Desktop, OpenCode, Router deployment, production enforcement, or remote legacy cleanup.
- OS-keychain storage or attestation.
- Unrelated providers, commands, UI, docs, dependencies, or release automation.
- Deleting remote secrets other than revoking the temporary npm token created for this beta.

## Reversibility

- Run release gates in a fresh clone; leave the dirty development worktree and `.pi/` untouched.
- Publish under `candidate` first. A failed candidate does not move `beta` or `latest`.
- Manual acceptance references the exact immutable package version/integrity and tag commit.
- Any runtime/auth/storage correction allocates a higher beta and repeats candidate/acceptance.
- Finalization moves channels without rebuilding; Router enforcement can independently return CLI
  policy to observe.
- Revoke the temporary npm token only after public verification; this does not alter the release.

---

## Step A: Prepare a clean, contract-frozen release commit

### Status

`in_progress`

### Objective

Convert the locally passing implementation into reproducible clean-checkout evidence and confirm an
unused release identity without touching unrelated user files.

### Tasks

- [x] Complete focused installation-auth tests, including storage, enrollment, proof, refresh race,
      protected headers, sign-out, diagnostics redaction, and no partial-stream replay.
- [x] Complete the full source tests without hosted credentials.
- [x] Pin the canonical fixture and manifest checksum.
- [ ] Review all current auth/release changes, changelogs, docs, manifests, and workflows; merge them
      through the repository's normal review path.
- [ ] Confirm the reviewed commit has no secret-looking values, developer paths, generated output,
      private workspace publication, or authenticated inference workflow.
- [ ] Create a fresh clean clone of the reviewed main commit in an operator-selected temporary path.
      Do not copy untracked files from the development workspace.
- [ ] Run the complete pre-tag sequence from `docs/releasing.md`, including package smoke.
- [ ] Run `git diff --check`, verify the clean clone remains clean after the non-release gates, and
      record the exact commit.
- [ ] Recheck npm/Git/GitHub immediately before selecting beta.7; use the next unused beta if any
      identity is occupied.
- [ ] Confirm staging Router/WebUI is healthy in dual-auth observe and the canonical fixture checksum
      matches before tagging.

### Relevant Files

- `packages/ai/src/api/adrouter-installation-auth*.ts`
- `packages/ai/test/fixtures/platform-auth-v1.json`
- `packages/coding-agent/src/core/adrouter-auth.ts`
- `packages/coding-agent/src/core/auth-storage.ts`
- `scripts/`
- `.github/workflows/`
- `docs/releasing.md`
- `release-manifest.json`
- Workspace package manifests/changelogs
- `PLAN.md`

### Expected Changes

- modify: reviewed source/release commit only if audit or clean gates expose a required defect
- no change: user-owned untracked development files

### Do Not Modify

- `.pi/`, unrelated provider records, generated `dist/`, tarballs, coverage, or public releases.
- Package versions before remote vacancy and changelog review.
- Router/Desktop/OpenCode repositories.

### Commands

~~~bash
git status --short --branch
git diff --check
npm view @adrouter/cli version dist-tags --json
gh release list --repo adrouter/adrouterCLI --limit 10
git ls-remote --tags origin refs/tags/v0.81.0-beta.7

cd "$CLI_RELEASE_CHECKOUT"
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
git status --short
~~~

### Acceptance Criteria

- [ ] Reviewed main contains the intended auth/release implementation and no unrelated/generated or
      secret material.
- [ ] Every documented clean pre-tag gate passes in a fresh clone.
- [ ] The clean clone remains clean; no ignore workaround or deletion of `.pi/` was used.
- [ ] Router staging and fixture checksum match the release commit.
- [ ] Beta.7 is unused across npm, Git refs, GitHub releases/drafts, and workflows, or a higher beta
      is selected and recorded.
- [ ] No OpenCode dependency or hosted inference credential exists in release automation.

### Validation Results

- Focused authentication tests: passed (74 tests).
- Full tests: passed (AI 539 passed/699 skipped; agent-core 180; coding-agent 1,522 passed/45
  skipped; TUI passed).
- Current dirty-worktree `npm run check`: fails only at public boundary because of unrelated
  `.pi/.profile-active.json`.
- Fresh clean-clone pre-tag sequence: not run.
- Remote beta.7 vacancy: last snapshot indicated unused; must be rechecked.

### Findings / Notes

- A temporary Git exclude or deleted user file is not acceptable release evidence. Use a clean clone
  of the reviewed commit.

---

## Step B: Create and publish the immutable CLI candidate

### Status

`todo`

### Objective

Create the beta release commit/tag, stage the immutable draft, and publish its exact tarball under
`candidate` without moving public beta channels.

### Tasks

- [ ] Create a fresh npm granular access token with read/write permission only for
      `@adrouter/cli`, bypass-2FA enabled for automation, and one-to-seven-day expiry.
- [ ] Store it interactively as `NPM_TOKEN` in protected GitHub environment `npm-publish`;
      never place the value in chat, command arguments, source, logs, or release notes.
- [ ] From the clean reviewed main checkout, audit the changelog and set
      `ADROUTER_CHANGELOG_AUDITED=1`.
- [ ] Run `node scripts/release.mjs 0.81.0-beta.7` only after vacancy is reconfirmed. Review its
      commits and immutable tag/push outcome.
- [ ] Wait for `release-tag.yml` to pass and create the draft prerelease; approve only the expected
      secret-free staging environment.
- [ ] Verify draft tag, target commit, tarball, `npm-artifacts.json`, checksums, SBOM,
      bundled-source inventory, notices, and attestations.
- [ ] Dispatch `promote-release.yml` with `phase=publish-candidate`.
- [ ] Verify npm `candidate` points to the exact version/integrity and that `beta`/`latest`
      still point to beta.6.
- [ ] Stop on any identity/integrity conflict; deprecate/replace with a higher beta rather than
      retagging or rebuilding.

### Relevant Files

- `scripts/release.mjs`
- `scripts/publish.mjs`
- `scripts/verify-draft-release.mjs`
- `.github/workflows/release-tag.yml`
- `.github/workflows/promote-release.yml`
- Package manifests, lockfile, changelogs, and `release-manifest.json`

### Expected Changes

- create: release commits, immutable beta tag, draft GitHub prerelease assets, npm candidate
- retain: existing `beta` and `latest` channels until finalization

### Do Not Modify

- Used versions/tags, candidate tarball, private workspace visibility, native artifact blockers, or
      another repository.
- GitHub/npm state without exact release authorization.

### Commands

~~~bash
gh secret set NPM_TOKEN --repo adrouter/adrouterCLI --env npm-publish

cd "$CLI_RELEASE_CHECKOUT"
git status --short
ADROUTER_CHANGELOG_AUDITED=1 node scripts/release.mjs 0.81.0-beta.7

gh release view v0.81.0-beta.7 --repo adrouter/adrouterCLI --json isDraft,isPrerelease,tagName,targetCommitish,assets
gh workflow run promote-release.yml --repo adrouter/adrouterCLI --ref v0.81.0-beta.7 -f tag=v0.81.0-beta.7 -f phase=publish-candidate
npm view @adrouter/cli@0.81.0-beta.7 version dist.integrity repository --json
npm view @adrouter/cli dist-tags --json
~~~

### Acceptance Criteria

- [ ] Release script starts from a clean reviewed main checkout and pushes one unused beta tag.
- [ ] The draft and npm candidate match the exact tag commit and tarball integrity.
- [ ] SBOM, checksums, notices, bundled-source inventory, package allowlist, and attestations pass.
- [ ] `candidate` points only to beta.7; `beta` and `latest` remain on beta.6.
- [ ] No private workspace or native archive is published.
- [ ] No AdRouter inference credential enters automation.

### Validation Results

- Release version/tag creation: not run; requires explicit authorization.
- Tag workflow/draft verification: not run.
- Candidate publication/registry verification: not run.

### Findings / Notes

- The release script commits and pushes. Do not run it merely as a local version preview.

---

## Step C: Accept the exact candidate and finalize beta

### Status

`todo`

### Objective

Prove the exact npm candidate on two distinct systems, attach sanitized evidence, and promote that
same tarball to `beta` and `latest`.

### Tasks

- [ ] On a primary operator system, install exact `@adrouter/cli@0.81.0-beta.7` or
      `@candidate`, verify version/integrity, run doctor, explicitly enroll through
      `/login adrouter`, and compare the WebUI code.
- [ ] Complete signed profile and both supported model turns, stream completion, token refresh
      rotation, replay/tamper/token-without-key rejection, revocation, minimum-version handling,
      diagnostics redaction, and local secret cleanup.
- [ ] Repeat the exact package matrix on a distinct OS/architecture cohort.
- [ ] Confirm both systems report `file_protected` and no test output contains auth material,
      prompts, responses, absolute private paths, or full fingerprints.
- [ ] Download the immutable `npm-artifacts.json`; create only the exact schema fields in
      `authentication-acceptance.json` with one tarball/integrity and two cohort records.
- [ ] Validate the acceptance asset locally against tag, commit, and manifest; inspect it manually.
- [ ] Upload it to the matching GitHub release without replacing any prior release asset.
- [ ] Dispatch `phase=finalize-release`; require all six anonymous installed-runtime jobs before
      dist-tag movement and GitHub publication.
- [ ] Verify `beta` and `latest` point to beta.7, `candidate` is absent, and npm/GitHub/
      manifest/provenance/acceptance identities agree.
- [ ] Delete `NPM_TOKEN` from the protected environment and revoke the granular npm token.
- [ ] Hand the exact version, tag, integrity, fixture checksum, and acceptance URL to the Router
      owner for staging soak.

### Relevant Files

- `scripts/authentication-acceptance.schema.json`
- `scripts/validate-authentication-acceptance.mjs`
- Draft/public release assets
- `release-manifest.json`
- `docs/releasing.md`

### Expected Changes

- create: sanitized acceptance asset
- modify: npm `beta`/`latest` and temporary `candidate` through protected finalization
- modify: GitHub draft to public prerelease without rebuilding

### Do Not Modify

- Candidate tarball, tag, commit, acceptance evidence after validation, stable metadata, or another
      repository.
- Local user projects/sessions beyond the intentional test installation cleanup.

### Commands

~~~bash
npm install --global --ignore-scripts @adrouter/cli@0.81.0-beta.7
adrouter --version
adrouter --json doctor

gh release download v0.81.0-beta.7 --repo adrouter/adrouterCLI --pattern npm-artifacts.json
node scripts/validate-authentication-acceptance.mjs --file authentication-acceptance.json --tag v0.81.0-beta.7 --commit "$CLI_RELEASE_COMMIT" --manifest npm-artifacts.json
gh release upload v0.81.0-beta.7 authentication-acceptance.json --repo adrouter/adrouterCLI
gh workflow run promote-release.yml --repo adrouter/adrouterCLI --ref v0.81.0-beta.7 -f tag=v0.81.0-beta.7 -f phase=finalize-release

npm view @adrouter/cli dist-tags --json
npm view @adrouter/cli@0.81.0-beta.7 version dist.integrity repository --json
gh release view v0.81.0-beta.7 --repo adrouter/adrouterCLI --json isDraft,isPrerelease,tagName,assets

gh secret delete NPM_TOKEN --repo adrouter/adrouterCLI --env npm-publish
~~~

### Acceptance Criteria

- [ ] Primary and distinct-second-system cohorts pass every schema result using the exact candidate.
- [ ] Acceptance matches version, tag, commit, one tarball integrity, `file_protected` storage, and
      redaction policy.
- [ ] Six anonymous npm OS/architecture installed-runtime jobs pass.
- [ ] Finalization uses the unchanged candidate and publishes a GitHub prerelease.
- [ ] `beta`/`latest` point to the accepted beta and `candidate` is absent.
- [ ] Temporary npm authentication is removed/revoked after verification.
- [ ] Router handoff is sufficient for CLI staging enforcement.

### Validation Results

- Exact candidate manual cohorts: not run.
- Acceptance validation/upload: not run; require explicit authorization for upload.
- Protected finalization/public verification: not run.
- Temporary token cleanup: not run.

### Findings / Notes

- Do not place `authentication-acceptance.json` in the source release commit. It is post-candidate
  evidence attached to the matching immutable release.

---

## Step D: Final verification and cleanup

### Status

`todo`

### Objective

Reconcile the exact public CLI release with source, package, acceptance, and staging behavior and
leave no temporary release material or unrelated workspace damage.

### Tasks

- [ ] Re-run the clean repository gate, isolated tests, release readiness, and package smoke at the
      public tag commit.
- [ ] Re-run exact installed beta enrollment, signed profile/turn, refresh, negative proof,
      revocation, upgrade, doctor, and sign-out after Router staging enforcement.
- [ ] Compare npm version/dist-tags/integrity, Git tag/commit, GitHub assets, manifest, checksums,
      attestations, and acceptance JSON.
- [ ] Review repository diff and packed contents for unrelated files, generated output, developer
      paths, secret material, stale copied-key guidance, or authenticated workflow calls.
- [ ] Remove only temporary test/release files created for this release; preserve user-owned
      `.pi/`, `AGENTS.md`, and all sessions/profiles not explicitly used for acceptance cleanup.
- [ ] Update docs if the implemented operator commands differ.
- [ ] Record remaining risks and Router rollback readiness.

### Relevant Files

- `packages/`
- `scripts/`
- `.github/workflows/`
- `docs/`
- `release-manifest.json`
- `PLAN.md`

### Expected Changes

- modify: tests/docs only if final verification exposes a required correction
- delete: only temporary acceptance/release files created by the operator

### Do Not Modify

- Immutable release artifacts/evidence, unrelated user work, stable metadata, or security behavior
      merely to make a test pass.

### Commands

~~~bash
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
git diff --check
git status --short
npm view @adrouter/cli dist-tags --json
~~~

### Acceptance Criteria

- [ ] Clean source, build, test, release-policy, package, and installed-runtime gates pass.
- [ ] Exact accepted beta works after Router staging enforcement.
- [ ] Registry/GitHub/source/artifact/provenance/acceptance identities agree.
- [ ] No secret, generated artifact, unrelated file, or authenticated inference job remains.
- [ ] Temporary npm auth is revoked and candidate state is clean.
- [ ] Router owner has verified rollback evidence and exact CLI identity.

### Validation Results

- Final clean suite: not run.
- Post-enforcement exact beta acceptance: not run.
- Final public reconciliation and cleanup: not run.

### Findings / Notes

- Do not mark done until the release-coordination and Router plans accept the handoff.

---

## Follow-up Work

- Stable `0.81.0` promotion and its separate soak.
- OS-keychain storage as a separately scoped enhancement.
- Production Router rollout and eventual hosted bearer removal.
- Native standalone archives only after target certification and signing requirements are met.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-07-27 | Use a fresh clone for final release gates. | Unrelated user-owned `.pi/` makes the current public-boundary result non-representative. | Release evidence is clean without deleting or ignoring user work. |
| 2026-07-27 | Default the candidate to beta.7 only if unused. | Beta.6 is the current immutable public release. | Remote vacancy is checked immediately before release. |
| 2026-07-27 | Keep existing protected two-phase promotion. | It already pauses for exact-candidate acceptance. | Candidate and final channels remain independently gated. |
| 2026-07-27 | Require two distinct OS/architecture cohorts. | File-protected auth and installed runtime behavior vary by host. | The acceptance validator remains a hard finalization gate. |
| 2026-07-27 | Publish beta only. | Functional staging rollout does not authorize stable. | Beta/latest move to the accepted beta; stable is deferred. |
| 2026-07-27 | Retain the documented temporary package-scoped npm token for this release. | Current CLI workflow uses it for publish and dist-tags. | Token is protected, short-lived, and revoked after verification. |
