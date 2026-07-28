# Plan: Fix AdRouterCLI Context Limits and Publish a Backend-Compatible Beta

## Goal

Make AdRouterCLI reliably authenticate to the installation-only staging Router, eliminate the
misleading HTTP 413 failure for ordinary growing sessions through an aligned 128K context contract
and bounded compact-and-retry behavior, verify the exact installed package end to end, and publish
the next immutable beta when all staging and release gates pass.

## Context

- `adrouter_release/adrouterCLI/` is the independent public `adrouter/adrouterCLI` repository. Its
  four workspaces version in lockstep, but only `@adrouter/cli` is public.
- Public remote state was rechecked on 2026-07-27: `@adrouter/cli@0.81.0-beta.7` and Git tag
  `v0.81.0-beta.7` are the current public baseline. Local branch/package metadata may still reflect
  beta.6, so implementation must begin from a clean branch based on the fetched public beta.7
  baseline rather than blindly versioning the current dirty branch.
- User-owned untracked `.pi/` and `AGENTS.md` exist in the local CLI worktree. Preserve them. Run
  final release gates from a clean checkout/worktree of the reviewed commit.
- The CLI already implements installation enrollment, user approval, proof-of-possession, token
  refresh, sign-out, diagnostics, and one-attempt overflow compaction machinery.
- The observed failure is:

  ```text
  Error: AdRouter request failed with HTTP 413 [input_limit_exceeded]: Input
  exceeds the platform token limit. Run /compact or reduce the current
  session context before retrying.
  ```

- Three mismatches cause this behavior:
  - the staging Router defaults to a 32,768 limit and currently counts UTF-8 bytes as tokens;
  - generated AdRouter models advertise `contextWindow: 1000000`, so proactive CLI compaction is
    delayed far beyond the server product limit;
  - generic overflow detection does not reliably classify the exact structured AdRouter
    `input_limit_exceeded` response/message, so automatic compact-and-retry may not start.
- The coordinated Router plan sets both hosted models to a 131,072-token total context,
  4,096-token maximum output, and 126,976-token maximum input, while retaining a separate 1 MiB
  request-body cap.
- With the existing 16,384-token compaction reserve, proactive compaction should begin around
  114,688 estimated context tokens. Server 413 remains a defensive fallback, not the normal trigger.
- The CLI is the active client focus. Desktop remains in the server contract but is not changed by
  this plan. OpenCode is unsupported on the current installation/legacy system and is not changed or
  released here.
- The next intended release identity is `0.81.0-beta.8`, but it may be used only if npm, Git refs,
  GitHub releases/drafts, and workflow state all show it is unused immediately before release. If it
  is occupied, select the lowest unused higher beta and record that decision.

### Operator setup and authentication

- GitHub CLI is authenticated as `HappyCool121`; verify access to `adrouter/adrouterCLI` and the
  protected `npm-publish` and `adrouter-staging` environments.
- npm CLI is authenticated locally as `imari`, but protected release automation requires a fresh
  package-scoped granular npm token stored as `NPM_TOKEN` in GitHub environment `npm-publish`.
  Create it through npm's WebUI with read/write access only to `@adrouter/cli`, automation/2FA bypass,
  and at most seven days of validity. Never send the value in chat or a command argument.
- The release process has protected candidate and finalization phases. The operator may need to
  approve environment prompts in GitHub.
- Manual authentication acceptance requires an invited staging owner to approve the CLI device code
  in `https://app-staging.adrouter.co`, plus a second tester/system with a distinct OS/architecture
  cohort. Do not share installation secrets between cohorts.
- Do not use or add `ADROUTER_STAGING_API_KEY`; the staging acceptance path is interactive
  installation approval. The stale Router environment secret is removed only after the coordinated
  cutover.

## Research Summary

- The repository's `docs/releasing.md`, `release-manifest.json`, `release-tag.yml`, and
  `promote-release.yml` define an immutable two-phase release: tag/draft, publish exact candidate,
  collect acceptance, then finalize the same tarball to `beta` and `latest`.
- `scripts/release.mjs` synchronizes workspace versions, regenerates models/artifacts, runs release
  checks, commits, tags, and pushes. It must run only after the exact version is proven vacant and
  the changelog is audited.
- Candidate acceptance requires the exact npm tarball/integrity, `file_protected` auth storage, a
  primary operator cohort, a distinct OS/architecture cohort, and the sanitized
  `authentication-acceptance.json` schema. Finalization also runs six anonymous installed-runtime
  jobs for the supported npm OS/architecture matrix.
- DeepSeek's [chat completion contract](https://api-docs.deepseek.com/api/create-chat-completion/)
  places prompt and completion within one context budget. The CLI must therefore advertise the
  Router's product context, not the provider's larger theoretical limit.
- DeepSeek's [token-usage guidance](https://api-docs.deepseek.com/quick_start/token_usage/) supports
  offline tokenizer-based estimation. The Router owns the authoritative token admission; the CLI
  uses a compatible/conservative estimate to compact early.
- Source, manifests, lockfile, release workflows, and public registry/tag state are authoritative
  where dated README or local branch metadata differs.

## Constraints

- Use Node.js `>=22.19.0`, npm workspaces, current exact dependency pins, and the repository release
  workflow. Do not normalize tooling with sibling repositories.
- Base implementation on the fetched public beta.7 commit. Preserve unrelated local/untracked work
  and use a clean checkout/worktree for release evidence.
- Set AdRouter `contextWindow` to 131,072 and `maxTokens` to 4,096 in the generator source, regenerate
  model files through the documented command, and keep both hosted model IDs identical.
- Treat 126,976 as the Router's maximum serialized model input. Keep proactive compaction below it by
  using the existing 16,384 reserve; do not increase the advertised window to suppress compaction.
- Prefer the structured AdRouter error code `input_limit_exceeded` over broad regex matching. Retain
  generic provider overflow behavior without turning rate limits or arbitrary HTTP 413 responses
  into compaction.
- Compact and automatically retry at most once per user turn. Never replay a partially consumed
  stream, paid response, emitted tool call, sponsor event, or settlement.
- If one irreducible user message/tool schema remains above the limit after compaction, fail locally
  with clear guidance before another paid request; do not loop.
- Preserve workspace trust, command approvals, session durability, tool behavior, cancellation,
  ad-first rendering, settlement, diagnostics redaction, and sponsor metadata isolation from model,
  tools, commands, edits, sessions, and compacted summaries.
- Official hosted origins require installation auth. Do not restore bearer-key fallback for hosted
  URLs. Loopback/custom-router compatibility may remain only where already explicitly supported.
- Do not alter or release Desktop/OpenCode, publish private workspaces, claim native archives, or
  move a used version/tag.
- Publish under `candidate` first. Do not move `beta` or `latest` until exact-candidate acceptance and
  all six installed-runtime jobs pass.
- Preserve user-owned `.pi/`, `AGENTS.md`, generated output boundaries, and unrelated changes.

## Out of Scope

- Router/WebUI implementation or deployment, except contract coordination and staging acceptance.
- Desktop client changes or release.
- OpenCode client changes, current support, or release.
- Stable `0.81.0`, native standalone archives, signing/notarization, or production Router rollout.
- A new API-credential system or future agentic ad-injection tiers.
- General compaction redesign for non-AdRouter providers.
- Unrelated commands, themes, model providers, dependencies, or UI redesign.

## Reversibility

- Develop from a branch based on the fetched beta.7 public baseline; leave the existing dirty
  worktree and its untracked files intact.
- Keep Router and CLI contract changes in separate reviewable commits. Before publication, source
  changes can be reverted without remote package impact.
- Publish a new immutable prerelease under `candidate`. If any gate fails, leave `beta`/`latest` on
  beta.7, fix forward with a higher unused beta, and never overwrite or retag the failed candidate.
- Manual acceptance binds to one exact package version, integrity, tag commit, and Router staging
  release. Finalization promotes that same tarball without rebuilding.
- Router policy can reject the candidate independently. Do not weaken installation auth or re-enable
  legacy credentials as a CLI rollback.
- Revoke the temporary npm token only after registry/GitHub verification; token revocation does not
  alter the published package.

---

## Step A: Rebase the work on the public beta and freeze the server contract

### Status

`todo`

### Objective

Start from the correct public baseline, map the exact 413/compaction flow, and establish one shared
Router/CLI limit and error contract before implementation.

### Tasks

- [ ] Fetch `origin` and tags, verify public npm/GitHub beta.7 identities, and identify the exact
      commit behind `v0.81.0-beta.7`.
- [ ] Create a clean implementation branch/worktree from that commit or updated `origin/main`; do
      not copy `.pi/`, local profiles, auth stores, generated output, or unrelated changes.
- [ ] Compare any unpublished local installation-auth work with the public baseline and port only
      changes still required for the current Router contract.
- [ ] Trace AdRouter HTTP errors from `AdRouterApiError` through assistant error messages,
      `isContextOverflow`, `AgentSession` auto-compaction, queued user input, retry state, and TUI/RPC
      output. Record where structured `code` is lost or stringified.
- [ ] Freeze the shared contract with the Router plan:
      - `context_window=131072`;
      - `max_input_tokens=126976`;
      - `max_output_tokens=4096`;
      - structured HTTP 413 code `input_limit_exceeded` and numeric details;
      - one compact-and-retry maximum;
      - no replay after any response stream content is consumed.
- [ ] Decide whether `/v1/models` is validation-only or can safely override the generated limits at
      runtime. Keep the generated values correct in either case so offline/model-list/compaction
      behavior is deterministic.
- [ ] Define local irreducible-overflow behavior and exact user guidance without exposing prompt,
      tool, auth, or server internals.
- [ ] Add the contract and boundary matrix to tests before changing implementation.

### Relevant Files

- `packages/ai/src/adrouter-config.ts`
- `packages/ai/src/api/adrouter.ts`
- `packages/ai/src/utils/error-body.ts`
- `packages/ai/src/utils/overflow.ts`
- `packages/ai/scripts/generate-models.ts`
- `packages/ai/src/providers/adrouter.models.ts`
- `packages/ai/src/models.generated.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/model-registry.ts`
- `packages/coding-agent/src/core/compaction/`
- `packages/coding-agent/src/core/diagnostics.ts`
- `docs/architecture.md`
- `docs/troubleshooting.md`

### Expected Changes

- create: a clean beta.7-based implementation branch/worktree
- modify: focused contract tests and documentation
- no change: public package/tags/channels during this step

### Do Not Modify

- Existing used beta.7 tag or npm package.
- User-owned `.pi/`, local auth/profile/session files, or unrelated working-tree changes.
- Router/Desktop/OpenCode repositories from this CLI plan.

### Commands

```bash
cd /Users/ahmadzuhri/antigravity/3days/adrouter_release/adrouterCLI
git status --short --branch
git fetch origin --prune --tags
git rev-parse v0.81.0-beta.7^{commit}
npm view @adrouter/cli@0.81.0-beta.7 version dist.integrity repository --json
gh release view v0.81.0-beta.7 --repo adrouter/adrouterCLI --json tagName,targetCommitish,isDraft,isPrerelease,assets
rg -n "input_limit_exceeded|isContextOverflow|contextWindow|reserveTokens|compaction" packages docs
```

### Acceptance Criteria

- [ ] Implementation is based on the exact public beta.7 lineage and unrelated local files remain
      untouched.
- [ ] Router/CLI limit arithmetic, structured error, retry, and no-replay behavior are documented in
      executable tests.
- [ ] The exact error propagation point and compaction trigger are identified without relying on
      broad 413 matching.
- [ ] Offline/generated model metadata and hosted discovery cannot disagree silently.

### Validation Results

- Remote baseline verification: not run during implementation.
- Contract trace: not run.
- Initial focused tests: not run.

### Findings / Notes

- Current generated AdRouter models come from `packages/ai/scripts/generate-models.ts`; do not hand
  edit generated provider/model output.
- `packages/ai/src/utils/overflow.ts` currently matches many provider strings but not the exact
  AdRouter structured code as a first-class signal.

---

## Step B: Implement proactive compaction and one-shot 413 recovery

### Status

`todo`

### Objective

Make ordinary sessions compact before the Router cap and recover once from an authoritative server
overflow without duplicate model/tool/paid-stream effects.

### Tasks

- [ ] Add shared AdRouter limit constants for 131,072 total, 126,976 input, and 4,096 output where
      needed; update generator source and regenerate both AdRouter model records.
- [ ] Preserve the existing 16,384 compaction reserve so proactive threshold behavior occurs around
      114,688 estimated context tokens. Test the off-by-one boundary.
- [ ] Carry `AdRouterApiError.code`, status, and sanitized numeric details through the provider and
      assistant error path without reducing the signal to a brittle display string.
- [ ] Extend overflow classification to recognize the exact structured
      `input_limit_exceeded` code and the current sanitized fallback message. Keep negative guards for
      rate limiting, generic transport-body 413, auth errors, and unrelated provider failures.
- [ ] Before sending an AdRouter turn, use the existing CLI estimator plus the hosted limits to:
      - trigger auto-compaction when the session exceeds the proactive threshold;
      - account for tool schemas/results and multibyte content conservatively;
      - identify a single irreducible message/schema that compaction cannot make sendable;
      - fail locally with `/compact`/reduce/split guidance when no safe request can be formed.
- [ ] On a server `input_limit_exceeded` response received before stream content, remove only the
      synthetic error from agent state, compact once, and retry the same logical user turn once.
- [ ] Ensure `_overflowRecoveryAttempted` is scoped/reset correctly per logical user turn and cannot
      cause an infinite loop or suppress later independent compaction.
- [ ] Never retry if any ad/text/thinking/tool/settlement/done content was consumed or if an abort,
      auth, quota, policy, rate-limit, provider, or transport error occurred.
- [ ] Keep queued follow-up/steering messages ordered across compaction and retry. Do not include
      sponsor metadata in the compacted summary.
- [ ] Improve TUI/print/RPC diagnostics so the user can distinguish proactive compaction, recovered
      server overflow, irreducible local overflow, and failed one-shot recovery without seeing
      internal payload or auth data.
- [ ] Add focused tests for ASCII/CJK/emoji, large tool schemas/results, exact thresholds, structured
      error propagation, fallback wording, one retry, retry reset, queue ordering, abort, partial
      stream, tool-call no-replay, sponsor isolation, and irreducible prompt behavior.

### Relevant Files

- `packages/ai/scripts/generate-models.ts`
- `packages/ai/src/adrouter-config.ts`
- `packages/ai/src/api/adrouter.ts`
- `packages/ai/src/api/adrouter.lazy.ts`
- `packages/ai/src/providers/adrouter.models.ts`
- `packages/ai/src/models.generated.ts`
- `packages/ai/src/utils/overflow.ts`
- `packages/ai/test/adrouter.test.ts`
- `packages/ai/test/context-overflow.test.ts`
- `packages/ai/test/overflow.test.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `packages/coding-agent/src/core/compaction/compaction.ts`
- `packages/coding-agent/src/core/diagnostics.ts`
- `packages/coding-agent/test/suite/agent-session-compaction.test.ts`
- `packages/coding-agent/test/agent-session-auto-compaction-queue.test.ts`

### Expected Changes

- modify: AdRouter generated-model source and regenerated outputs
- modify: structured error propagation, overflow classification, preflight/compaction, diagnostics,
  and focused tests
- modify: troubleshooting/architecture documentation

### Do Not Modify

- Generated model files by hand.
- Generic provider limits or compaction behavior unless a shared fix is required and covered by
  provider regression tests.
- Sponsor content flow, command approvals, tool execution, or installation secret storage.
- Dependency pins unless an implementation necessity is documented and the lockfile is updated by
  npm in the clean implementation branch.

### Commands

```bash
cd /Users/ahmadzuhri/antigravity/3days/adrouter_release/adrouterCLI
npm --prefix packages/ai run generate-models
npm --prefix packages/ai test -- test/overflow.test.ts test/context-overflow.test.ts test/adrouter.test.ts
npm --prefix packages/coding-agent test -- test/suite/agent-session-compaction.test.ts test/agent-session-auto-compaction-queue.test.ts
npm run build
```

### Acceptance Criteria

- [ ] Both AdRouter models advertise 131,072 context and 4,096 output from generated source/output.
- [ ] CLI compacts before the 126,976 server input maximum under the default reserve.
- [ ] Structured AdRouter overflow triggers exactly one safe compact-and-retry.
- [ ] Partial streams, tool calls, sponsor events, settlements, aborts, and non-overflow failures are
      never replayed.
- [ ] Irreducible oversized input fails locally with clear action and no retry loop.
- [ ] Multibyte/tool-schema estimates remain conservative enough to avoid routine server 413s.
- [ ] Focused AI and coding-agent tests pass without leaking sensitive data.

### Validation Results

- Model regeneration: not run.
- Focused AI overflow tests: not run.
- Focused coding-agent compaction tests: not run.
- Build: not run.

### Findings / Notes

- If dynamic `/v1/models` metadata is consumed, reject malformed or larger-than-compiled hosted
  values rather than trusting an accidental server expansion that would delay compaction.

---

## Step C: Verify the exact source build against the cutover-ready Router

### Status

`todo`

### Objective

Prove the reviewed CLI build works with installation-only auth and the 128K Router contract before
creating an immutable release candidate.

### Tasks

- [ ] Run the full clean repository gate, isolated tests, release-readiness checks, and local package
      smoke from a clean checkout of the reviewed commit.
- [ ] Install the production-faithful local package into an isolated prefix/config directory; never
      reuse the developer's normal `~/.adrouter` state for acceptance.
- [ ] Against a local Router, prove login/device approval, profile, both hosted model IDs, text,
      reasoning, tools, refresh rotation, sign-out/revoke, re-enrollment, and JSON doctor.
- [ ] Prove legacy bearer material cannot authenticate to official hosted origins and OpenCode is not
      offered or used by CLI flows.
- [ ] Run deterministic local/stub boundary cases:
      - just below and at proactive compaction threshold;
      - above the old 32,768 limit but below the new limit;
      - exact 126,976 input boundary and one-token overflow;
      - first server 413 followed by successful compacted retry;
      - second 413 terminates without another retry;
      - partial stream and tool call are never replayed;
      - single irreducible oversized prompt fails locally.
- [ ] After the Router compatibility deployment but before destructive cutover, enroll a fresh CLI
      installation on staging and run a bounded context case above the old limit with low output.
- [ ] Repeat core login/profile/models/tools/refresh/revoke behavior after the Router cutover; verify
      active-only WebUI state and exact server-advertised limits.
- [ ] Capture only sanitized aggregate/identity evidence: CLI version, package integrity, Router
      release/commit, model IDs/limits, status codes, and pass/fail. Do not capture prompts,
      responses, device codes, tokens, private paths, or full thumbprints.

### Relevant Files

- `scripts/ci-package-smoke.mjs`
- `scripts/check-release-readiness.mjs`
- `scripts/verify-installed-runtime.mjs`
- `packages/ai/test/`
- `packages/coding-agent/test/`
- `docs/installation.md`
- `docs/troubleshooting.md`
- `release-manifest.json`

### Expected Changes

- modify: implementation/tests/docs only if a validation gate exposes a required defect
- no change: npm/GitHub release state

### Do Not Modify

- Normal user auth/session/profile files.
- Router staging policy to weaken auth for testing.
- Test thresholds or redaction rules merely to pass.

### Commands

```bash
cd "$CLI_RELEASE_CHECKOUT"
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
npm run install:local
git diff --check
git status --short

adrouter --offline --list-models adrouter
adrouter --json doctor
```

### Acceptance Criteria

- [ ] Full clean-checkout, isolated, readiness, and package-smoke gates pass.
- [ ] Production-faithful local install reports the expected version and 128K model metadata.
- [ ] Local/stub tests prove all context boundaries, one-shot recovery, and no-replay cases.
- [ ] Staging installation auth works before and after legacy cutover without bearer fallback.
- [ ] A bounded staging session above the old 32K cap completes successfully or compacts proactively
      according to the new limit.
- [ ] Doctor and errors remain sanitized; acceptance output contains no auth/user content.

### Validation Results

- Full source gate: not run.
- Isolated/release-readiness/package smoke: not run.
- Local Router integration: not run.
- Staging pre/post-cutover acceptance: not run.

### Findings / Notes

- Do not use `npm link` as release evidence; `npm run install:local` and the final exact registry
  package are the production-shaped paths.

---

## Step D: Publish, accept, and promote the next immutable beta

### Status

`todo`

### Objective

Publish the reviewed fix under a temporary candidate tag, validate that exact tarball on two
systems against staging, and promote it to public beta channels without rebuilding.

### Tasks

- [ ] Recheck npm package versions/dist-tags, Git refs, GitHub releases/drafts, Actions runs, and the
      current public baseline immediately before selecting beta.8; choose the next unused higher beta
      on any conflict.
- [ ] Create the short-lived granular npm token and store it interactively as `NPM_TOKEN` in the
      protected `npm-publish` GitHub environment. Confirm `adrouter-staging` contains no legacy API
      key dependency for acceptance.
- [ ] Audit changelogs/release notes and run `scripts/release.mjs` from a clean reviewed `main` with
      `ADROUTER_CHANGELOG_AUDITED=1`. Review the release commit and immutable tag.
- [ ] Wait for `release-tag.yml` to pass and create the draft prerelease. Verify commit, version,
      tarball, integrity, checksums, SBOM, bundled-source inventory, notices, provenance, and native
      artifact blockers.
- [ ] Dispatch `promote-release.yml` with `phase=publish-candidate`; verify only `candidate` points to
      the new version while `beta` and `latest` remain on beta.7.
- [ ] On the primary cohort, install the exact candidate anonymously in a clean environment, verify
      version/integrity, enroll through staging WebUI approval, and run doctor/profile/both models/
      tools/refresh/revoke/re-enroll plus the long-context acceptance.
- [ ] Repeat the exact package and core auth/context matrix on a distinct OS/architecture cohort.
      Both must report the expected `file_protected` storage classification.
- [ ] Generate the minimal sanitized `authentication-acceptance.json`, validate it against the exact
      tag/commit/npm artifact/manifest, inspect it manually, and upload it without replacing another
      release asset.
- [ ] Dispatch `phase=finalize-release`; require all six anonymous registry install jobs before
      moving `beta` and `latest` or publishing the GitHub prerelease.
- [ ] Verify npm `beta` and `latest` point to the accepted version, `candidate` is absent, GitHub
      prerelease is public, and package/tag/commit/integrity/provenance/acceptance all agree.
- [ ] Delete `NPM_TOKEN` from the GitHub environment and revoke the granular npm token in npm's WebUI
      after verification. If anything fails, fix forward with a higher beta; never rebuild/retag the
      same version.

### Relevant Files

- `package.json`
- `package-lock.json`
- Workspace package manifests and changelogs
- `release-manifest.json`
- `docs/releasing.md`
- `scripts/release.mjs`
- `scripts/verify-draft-release.mjs`
- `scripts/authentication-acceptance.mjs`
- `scripts/authentication-acceptance.schema.json`
- `scripts/validate-authentication-acceptance.mjs`
- `.github/workflows/release-tag.yml`
- `.github/workflows/promote-release.yml`

### Expected Changes

- modify: release version/changelogs/manifests through the release script
- create: immutable Git tag, draft/public GitHub prerelease, npm candidate, acceptance asset
- modify: npm `beta` and `latest` only after all finalization gates pass
- delete: temporary npm candidate tag and temporary GitHub npm secret after success

### Do Not Modify

- Used beta.7 identity or any failed candidate identity.
- Private workspace visibility or standalone native artifact blockers.
- Release assets/tarballs after publication.
- npm/GitHub state before exact version vacancy and staging readiness are reconfirmed.

### Commands

```bash
npm view @adrouter/cli version versions dist-tags --json
git ls-remote --tags origin refs/tags/v0.81.0-beta.8
gh release view v0.81.0-beta.8 --repo adrouter/adrouterCLI
gh run list --repo adrouter/adrouterCLI --limit 20
gh secret set NPM_TOKEN --repo adrouter/adrouterCLI --env npm-publish

cd "$CLI_RELEASE_CHECKOUT"
git status --short
ADROUTER_CHANGELOG_AUDITED=1 node scripts/release.mjs 0.81.0-beta.8

gh release view v0.81.0-beta.8 --repo adrouter/adrouterCLI --json isDraft,isPrerelease,tagName,targetCommitish,assets
gh workflow run promote-release.yml --repo adrouter/adrouterCLI --ref v0.81.0-beta.8 -f tag=v0.81.0-beta.8 -f phase=publish-candidate
npm view @adrouter/cli@0.81.0-beta.8 version dist.integrity repository --json
npm view @adrouter/cli dist-tags --json

gh workflow run promote-release.yml --repo adrouter/adrouterCLI --ref v0.81.0-beta.8 -f tag=v0.81.0-beta.8 -f phase=finalize-release
npm view @adrouter/cli version dist-tags --json
gh secret delete NPM_TOKEN --repo adrouter/adrouterCLI --env npm-publish
```

### Acceptance Criteria

- [ ] Selected beta identity was unused across npm, Git, GitHub, and Actions immediately before use.
- [ ] Candidate tarball exactly matches tag commit, manifest, integrity, checksums, SBOM, notices,
      bundled sources, and provenance.
- [ ] `beta`/`latest` remain on beta.7 until two-cohort acceptance and six anonymous install jobs
      pass.
- [ ] Both cohorts prove installation auth, both models, tools, refresh/revoke, doctor redaction, and
      long-context behavior against cutover staging.
- [ ] Final public npm/GitHub identities agree and no native/private package is published.
- [ ] Temporary npm secret/token and candidate tag are removed after success.

### Validation Results

- Release identity vacancy: not run.
- Tag/draft workflow: not run.
- Candidate publication: not run.
- Two-cohort acceptance: not run.
- Six anonymous install jobs/finalization: not run.
- Temporary credential cleanup: not run.

### Findings / Notes

- If beta.8 is no longer vacant, replace every example identity consistently with the lowest unused
  higher beta before running any release command.
- `scripts/release.mjs` commits, tags, and pushes; it is not a dry-run version preview.

---

## Step E: Final verification and cleanup

### Status

`todo`

### Objective

Leave a reproducible public beta and clean repository state whose documented behavior matches the
installation-only staging Router.

### Tasks

- [ ] Re-run `npm run check`, isolated tests, release-readiness, and package smoke against the final
      public tag or a clean checkout of its commit.
- [ ] Install `@adrouter/cli@beta` anonymously and confirm it resolves to the accepted version,
      reports 131,072/4,096 model limits, and passes offline model listing and JSON doctor.
- [ ] Re-run one bounded staging login/profile/model/tool/refresh/revoke flow and one accumulated
      context flow above the old 32K cap from the public package.
- [ ] Verify old API keys, OpenCode, revoked installations, and a second overflow retry remain
      rejected without changing Router policy.
- [ ] Review the final diff/tag/package contents for secret material, developer paths, `.pi/`,
      generated junk, unexpected dependencies, private packages, or unrelated changes.
- [ ] Remove temporary local acceptance directories/files and stale release credentials without
      touching normal user state.
- [ ] Update README/installation/troubleshooting/architecture/release documentation with the final
      version, installation-only login, 128K behavior, one-shot recovery, and actionable irreducible
      overflow guidance.
- [ ] Record exact version, tag, commit, npm integrity, Router release/commit, acceptance asset URL,
      cohorts, validation outcomes, skipped reasons, and remaining follow-up work.

### Relevant Files

- `README.md`
- `SECURITY.md`
- `docs/`
- `release-manifest.json`
- `packages/`
- `scripts/`
- `.github/workflows/`
- `PLAN.md`

### Expected Changes

- modify: final documentation/tests only if required by verification
- delete: temporary acceptance material and expired release authentication
- no change: accepted immutable package/tag/assets

### Do Not Modify

- Published tarball/tag/acceptance identities.
- User-owned `.pi/`, normal auth/session/profile state, or sibling repositories.
- Router production policy or unsupported clients.

### Commands

```bash
cd "$CLI_RELEASE_CHECKOUT"
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
git diff --check
git status --short

npm view @adrouter/cli version dist-tags dist.integrity --json
gh release view v0.81.0-beta.8 --repo adrouter/adrouterCLI --json tagName,targetCommitish,isDraft,isPrerelease,assets,url
```

### Acceptance Criteria

- [ ] All applicable source, isolated, readiness, packaging, anonymous install, and staging checks
      pass, or a skipped check has a documented reason.
- [ ] Public `@beta` and `@latest` install the same accepted immutable version/integrity.
- [ ] Public CLI works with installation-only staging and sessions above the former 32K limit.
- [ ] Auto-compaction/recovery occurs at most once and never replays partial paid/tool streams.
- [ ] Final source/package/release contains no auth material, private path, `.pi/`, private workspace,
      or unintended artifact.
- [ ] Temporary npm auth is revoked and final evidence is sanitized and recorded.

### Validation Results

- Final clean suite: not run.
- Anonymous public install: not run.
- Final staging acceptance: not run.
- Diff/package/secret review: not run.

### Findings / Notes

- Mark this step done only after the Router plan's destructive cutover and final staging verification
  also pass.

---

## Follow-up Work

- Resume Desktop client work later against the retained installation-auth backend contract, then run
  its own packaging/signing/release plan before enabling the Desktop staging policy.
- Design and implement the future agentic API-credential system independently. OpenCode may consume
  that new protocol after its own threat model, tiered ad-injection tests, and release plan; do not
  re-enable legacy `adr_*` keys.
- Plan production Router/CLI rollout and stable release only after a separate staging soak and review.
- Revisit larger product context windows only with provider evidence, cost/capacity tests, Router
  tokenizer validation, CLI compaction updates, and a new coordinated contract version.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-07-27 | Replace the previous CLI platform-access rollout plan. | The earlier plan targeted beta.7 installation auth but did not address the observed 413 or current public baseline. | This file is now the CLI implementation/release source of truth. |
| 2026-07-27 | Base work on public beta.7 and target beta.8 only if unused. | Public state advanced beyond stale local beta.6 metadata. | Release work must fetch remote state and never reuse an occupied identity. |
| 2026-07-27 | Adopt 131,072 total context, 126,976 input, and 4,096 output. | The user chose the 128K product option and the server/CLI must share one contract. | Generated models compact around 114,688 with the existing reserve. |
| 2026-07-27 | Prefer structured AdRouter overflow handling with one retry. | The exact server code is safer than broad HTTP/message matching, and bounded retry prevents duplicate paid/tool work. | Ordinary overflow compacts automatically; partial streams and repeated failures never replay. |
| 2026-07-27 | Focus only on CLI while retaining Desktop backend compatibility. | The broader product includes Desktop later, but current delivery priority is CLI. | No Desktop/OpenCode client changes or releases occur in this plan. |
| 2026-07-27 | Keep OpenCode unsupported until a new credential product exists. | Future OpenCode use will have different agentic credentials and tiered ad injection. | CLI and current Router auth must not restore legacy/OpenCode access. |
| 2026-07-27 | Release through immutable candidate acceptance. | Published versions/tags cannot be safely overwritten and authentication needs installed-package evidence. | `beta`/`latest` move only after two cohorts and six anonymous registry jobs pass. |
