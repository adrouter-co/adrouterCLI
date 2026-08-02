# Plan: Router-synchronized AdRouterCLI catalog, locked runtime, sponsor panel, and product guide

## Goal

Make AdRouterCLI consume a deterministic snapshot of the Router-owned eight-model catalog, remove
all executable models.json and official runtime provider-registration behavior, restore the
full-width safe sponsor panel, and publish one canonical product guide without changing hosted
limits, authentication, streaming, tool safety, compaction, release channels, or deployed state.
After that implementation is verified, release it as the next immutable npm/GitHub beta through
the repository's protected candidate and promotion workflows.

## Context

- This is the independent AdRouterCLI repository represented by the current checkout.
- At the planning checkpoint on 2026-08-02, the branch was
  codex/agnes-models-beta17...origin/codex/agnes-models-beta17.
- The checkout has one pre-existing modified file:
  packages/coding-agent/src/core/model-registry.ts. Inspection shows an accidental leading s before
  static create at line 379. The user directed the future implementation to remove exactly that
  character before feature edits. This plan-writing task must not alter it.
- The previous PLAN.md covered beta.17 promotion and had an in-progress release step. The user
  explicitly authorized replacing that plan. This plan does not continue, publish, tag, deploy, or
  promote beta.17.
- packages/ai/scripts/generate-models.ts currently hand-defines the eight AdRouter models and their
  thinking maps, then writes packages/ai/src/providers/adrouter.models.ts.
- packages/ai/src/api/adrouter.ts separately hand-defines Agnes model sets to choose an absent
  reasoning fallback. packages/ai/src/adrouter-config.ts separately owns hosted limit constants.
- packages/coding-agent/src/core/model-registry.ts currently parses, validates, merges, refreshes,
  and applies models.json providers, endpoints, headers, API keys, models, and overrides.
- Default SDK/session creation passes a models.json path, and interactive selectors, list commands,
  OAuth UI, resolver messages, and tests expose or explain that behavior.
- The active bundled cache optimizer reads and writes models.json. The active bundled OpenCode
  bridge registers providers. Both must be retired from the packaged official product.
- Provider injection remains supported only for explicitly constructed SDK/test registries. The
  official CLI, default session services, and extension runtime are locked to provider adrouter.
- The existing sponsor component sanitizes and wraps text but renders an unhighlighted structured
  title/tier/body/action block. Earlier beta.10/beta.11 history contains the intended highlight,
  wrapping, replacement, and narrow-terminal behavior to combine safely.
- No docs/about.md exists. Product behavior is spread across README files and topic documents, and
  current documentation checks keep a separate hand-written model list.
- The Router artifact produced by the sibling plan is the source of truth. The CLI vendors its exact
  bytes at packages/ai/catalog/adrouter-model-catalog.v1.json.
- The authoritative Router handoff was verified at commit
  b4be026693fc60d590d508c3dad2c8befe1d4587. The tracked source artifact and vendored bytes have
  file SHA-256 4b138691a4066f0b639a69c4ab6a2376481c20731a8e36b1c0c107183c7ba37e and catalog digest
  sha256:e8e5f875b6c901ed98c3b07b5ad9aa107a52562dc9157aa8eae99b73562ca9be.
- The required catalog order and behavior are:

| Order | Model ID | Class | Thinking levels | Default | Limits |
| ---: | --- | --- | --- | --- | --- |
| 1 | deepseek-v4-flash | flash | none, medium, high | medium | 131072 / 126976 / 4096 |
| 2 | deepseek-v4-pro | pro | none, medium, high | medium | 131072 / 126976 / 4096 |
| 3 | mimo-v2.5 | flash | none, high | high | 131072 / 126976 / 4096 |
| 4 | mimo-v2.5-pro | pro | none, high | high | 131072 / 126976 / 4096 |
| 5 | agnes-2.0-flash | flash | none, high | none | 131072 / 126976 / 4096 |
| 6 | agnes-2.5-flash | flash | none, high | none | 131072 / 126976 / 4096 |
| 7 | agnes-2.5-pro | pro | high | high | 131072 / 126976 / 4096 |
| 8 | agnes-2.5-pro-alpha | pro | high | high | 131072 / 126976 / 4096 |

- In the Limits column, values are total context / maximum input / maximum output tokens.
- On 2026-08-02 the user explicitly authorized npm and GitHub publication. Current remote state was
  re-queried before release preparation: `@adrouter/cli@0.81.0-beta.17` already exists immutably on
  npm under `candidate`, and `v0.81.0-beta.17` already points to remote `main` commit
  `2d5344f82a775bcd89e38de18614d8a7eaf373ed`. This implementation must therefore use the next
  unused version, `0.81.0-beta.18`.
- GitHub CLI authentication is currently invalid and local npm authentication is absent. The
  protected workflow remains the only authorized publication path; its `npm-publish` environment
  must supply `NPM_TOKEN`, and final promotion still requires the schema-valid redacted
  two-cohort authentication acceptance asset.

## Research Summary

- Current executable sources and tests inspected during planning include:
  - packages/ai/scripts/generate-models.ts
  - packages/ai/src/providers/adrouter.models.ts
  - packages/ai/src/api/adrouter.ts
  - packages/ai/src/adrouter-config.ts
  - packages/ai/test/adrouter.test.ts
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/agent-session-services.ts
  - packages/coding-agent/src/core/model-resolver.ts
  - packages/coding-agent/src/core/extensions/loader.ts
  - packages/coding-agent/src/core/extensions/runner.ts
  - packages/coding-agent/src/core/extensions/types.ts
  - packages/coding-agent/src/core/bundled-features.ts
  - packages/coding-agent/src/config.ts
  - packages/coding-agent/src/cli/list-models.ts
  - packages/coding-agent/src/modes/interactive/components/model-selector.ts
  - packages/coding-agent/src/modes/interactive/components/oauth-selector.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/modes/interactive/components/adrouter-ad-panel.ts
  - packages/coding-agent/test/model-registry.test.ts
  - packages/coding-agent/test/adrouter-ad-panel.test.ts
  - scripts/verify-installed-runtime.mjs
  - scripts/check-docs.mjs
  - scripts/check-release-readiness.mjs
  - packages/coding-agent/BUNDLED_SOURCES.json
- ModelRegistry.inMemory and injected modelRegistry SDK options already provide the seam needed to
  retain synthetic providers in SDK/tests without exposing them in official default runtime.
- The TUI already exports visible-width wrapping/truncation, capability detection, and OSC-8
  hyperlink helpers. The sponsor redesign needs no new terminal dependency.
- Theme files already define sponsoredFooterHighlight as #17364a in light and dark modes.
- Git history at c8d97b3 shows the full-width highlighted beta.10 panel. History around c71072b
  shows later sanitization, wrapping, state replacement, and narrow-width handling. The new panel
  should combine those verified behaviors rather than restore either revision wholesale.
- Active models.json behavior is concentrated in the registry/default wiring, UI diagnostics, and
  two bundled extensions. Historical changelogs and third-party notices may retain textual
  references when they remain historically accurate.
- No external web research is needed: the requested contract is defined by the sibling Router
  artifact and current repository behavior, and no new third-party package or API is introduced.

## Constraints

- Preserve existing user-facing behavior except for the explicitly requested catalog source,
  official AdRouter-only registry, removal of models.json/provider extension behavior, sponsor
  redesign, and documentation consolidation.
- Keep implementation small, reviewable, staged, and reversible.
- Prefer minimal diffs over broad rewrites.
- Do not introduce new dependencies.
- Never hand-edit packages/ai/src/providers/adrouter.models.ts; regenerate it.
- Preserve the official hosted endpoint and installation-proof flow, including fresh DPoP-style
  proofs, short-lived access tokens, rotating refresh tokens, and /v1/agent/turn.
- Preserve supported custom/loopback bearer endpoint behavior configured through its existing
  explicit interfaces; models.json must not configure or override it.
- Preserve workspace trust, project-local configuration gating, command/mutation approvals,
  secret redaction, bounded streaming, no paid-request replay, and local session ownership.
- Preserve 131,072 total context, 126,976 maximum input, and 4,096 maximum output tokens.
- Do not change token estimation, local preflight, compaction reserve, compaction threshold or
  algorithm, request caps, retry behavior, or session persistence.
- Sponsor metadata remains display/accounting data only. Existing `adrouter.settlement` entries,
  replay cards, and cumulative subsidy accounting may remain in local session state, but they must
  never enter provider/model messages, assistant output, tool definitions/results, commands,
  approvals, edits, patches, or compacted model context.
- An existing user models.json must never be read, parsed, warned about, modified, migrated,
  renamed, or deleted.
- Retain provider injection only through an explicitly supplied/in-memory registry for SDK and
  tests. Remove it from the official extension API and default CLI runtime.
- During implementation, do not change package versions, release manifests, lockfiles, tags,
  channels, workflows, hosted secrets, or deployed services. During the separately authorized
  release phase, change only the synchronized beta.18 versions, package lock/shrinkwrap, changelog,
  README version references, and release manifest required by the existing release procedure.
- Do not include helper branding, hidden metadata comments, or non-plan administrative sections.

## Out of Scope

- Router source implementation; the sibling router/PLAN.md owns it.
- Context-window, maximum-input, maximum-output, body-size, quota, admission, token-estimation,
  compaction, or streaming-protocol changes.
- Database migrations or hosted state changes.
- New providers, hosted OpenCode access, or a replacement user-configurable provider format.
- Sponsor selection, inventory, settlement, billing, impression, or click-policy changes.
- General terminal UI redesign outside the sponsor panel and its stale-row clearing.
- Rewriting historical changelogs or attribution notices solely to remove old textual references.
- Direct local npm publication, bypassing protected workflows, reusing beta.17, or skipping
  authentication acceptance and six-platform installed-runtime gates.
- Router, WebUI, database, Fly, Cloudflare, production, or other hosted deployment changes.
- Unrelated refactors, file renames, or opportunistic cleanup.

## Reversibility

- Add and validate the vendored Router artifact and generated metadata before changing default
  registry behavior.
- Lock the default registry before removing models.json parsing and UI messages so tests can prove
  the replacement catalog first.
- Remove active bundled extensions only after official-runtime and SDK-injection tests distinguish
  the supported paths.
- Never mutate user models.json; rollback is a source revert, not a user-data restoration.
- Keep catalog, registry, bundle retirement, sponsor UI, and docs in separate implementation
  commits aligned with the steps below.
- Preserve programmatic in-memory provider injection so internal SDK/test fixtures do not require a
  second configuration system.
- No hosted or persisted-state migration is involved. Deleted bundled source remains recoverable
  from Git history.
- Beta.18 is immutable once published. If candidate verification fails after publication, deprecate
  it and fix forward with a higher beta; never overwrite, unpublish, or move its tag.

---

## Step A: Vendor and generate from the Router catalog

### Status

complete

### Objective

Replace every hand-maintained AdRouter model descriptor and limit copy with deterministic output
from the validated Router artifact.

### Tasks

- [ ] Before feature edits, remove only the accidental leading s before static create in
      packages/coding-agent/src/core/model-registry.ts and confirm the diff is exactly one
      character; do not discard or rewrite the file.
- [ ] Obtain the committed Router artifact
      router/backend/catalog/model-catalog.v1.json from the exact Router commit implementing its
      plan.
- [ ] Create packages/ai/catalog/adrouter-model-catalog.v1.json as a byte-for-byte vendored copy.
- [ ] Add scripts/sync-adrouter-catalog.mjs with --source and --check modes.
- [ ] Default --source to ../../router/backend/catalog/model-catalog.v1.json for this consolidation
      workspace, while permitting an explicit path for CI and standalone use.
- [ ] Validate schema_version 1, sha256 digest syntax/content, exact required fields, unique IDs,
      provider/class values, default thinking membership, and positive limits before copying or
      generating.
- [ ] In sync mode, copy only after successful validation, then invoke scoped AdRouter generation.
- [ ] In check mode, validate the vendored snapshot and generated output in memory without writing.
      If --source is supplied, also require byte-for-byte source/vendor equality.
- [ ] Refactor the AdRouter-scoped branch of packages/ai/scripts/generate-models.ts to run before
      any upstream provider fetch and remain fully local and deterministic.
- [ ] Derive all eight AdRouter model objects from the vendored artifact in canonical order.
- [ ] Generate these named exports in adrouter.models.ts:
      ADROUTER_MODELS, ADROUTER_CATALOG_SCHEMA_VERSION, ADROUTER_CATALOG_DIGEST,
      ADROUTER_CATALOG_METADATA, and ADROUTER_HOSTED_LIMITS.
- [ ] Include underlying Router provider, model_class, description, advertised thinking levels,
      default thinking level, and maximum input tokens in ADROUTER_CATALOG_METADATA.
- [ ] Keep runtime provider equal to adrouter and runtime name equal to AdRouter plus the Router
      display_name.
- [ ] Derive CLI thinking maps mechanically:
      off maps to none only when advertised; medium maps to medium only when advertised; high maps
      to high only when advertised; minimal, low, xhigh, max, and every unsupported mode map to null.
- [ ] Make packages/ai/src/api/adrouter.ts use generated default_thinking_level metadata for absent
      reasoning, including ADROUTER_MODEL_ROUTE overrides. Remove the Agnes ID sets.
- [ ] Make packages/ai/src/adrouter-config.ts import the generated common hosted limits; keep
      compaction reserve and all related calculations unchanged.
- [ ] Fail generation if all models do not share the required 131072 / 126976 / 4096 contract.
- [ ] Add root package scripts catalog:sync, catalog:generate, and catalog:check, and add the
      non-writing check to the normal repository gate.
- [ ] Ensure scoped generation leaves every non-AdRouter provider catalog and
      packages/ai/src/models.generated.ts byte-identical.

### Relevant Files

- packages/coding-agent/src/core/model-registry.ts
- packages/ai/catalog/adrouter-model-catalog.v1.json
- scripts/sync-adrouter-catalog.mjs
- packages/ai/scripts/generate-models.ts
- packages/ai/src/providers/adrouter.models.ts
- packages/ai/src/api/adrouter.ts
- packages/ai/src/adrouter-config.ts
- packages/ai/test/adrouter.test.ts
- package.json

### Expected Changes

- modify first by exactly one pre-existing typo character: packages/coding-agent/src/core/model-registry.ts
- create: packages/ai/catalog/adrouter-model-catalog.v1.json
- create: scripts/sync-adrouter-catalog.mjs
- modify: packages/ai/scripts/generate-models.ts
- regenerate: packages/ai/src/providers/adrouter.models.ts
- modify: packages/ai/src/api/adrouter.ts
- modify: packages/ai/src/adrouter-config.ts
- modify: packages/ai/test/adrouter.test.ts
- modify: package.json

### Do Not Modify

- packages/ai/src/models.generated.ts during scoped generation
- Non-AdRouter generated provider catalogs
- Token-estimation, request-limit, retry, streaming, or compaction implementations
- npm dependencies, package versions, release metadata, or workflows
- Any Router repository source from this step

### Commands

~~~bash
npm run catalog:sync -- --source ../../router/backend/catalog/model-catalog.v1.json
npm run catalog:check -- --source ../../router/backend/catalog/model-catalog.v1.json
npm test --workspace @adrouter/ai -- adrouter.test.ts
git diff --check
~~~

### Acceptance Criteria

- [ ] The vendored artifact is byte-identical to the supplied Router artifact.
- [ ] Schema and digest validation fails closed before any output write.
- [ ] Generated catalog order, IDs, names, descriptions, classes, modes, defaults, and limits match
      the artifact exactly.
- [ ] Absent reasoning maps to medium for DeepSeek, high for MiMo, none for Agnes Flash, and high for
      Agnes Pro.
- [ ] Routed model overrides use the routed model's generated default.
- [ ] Scoped generation requires no network and changes no unrelated generated catalog.
- [ ] The hosted limit constants derive from generated metadata without changing calculations.
- [ ] The pre-existing typo fix is exactly one character before the planned feature diff.
- [ ] Focused AI tests and catalog checks pass.

### Validation Results

- npm run catalog:sync -- --source ../../router/backend/catalog/model-catalog.v1.json: passed
- npm run catalog:check -- --source ../../router/backend/catalog/model-catalog.v1.json: passed
- npm test --workspace @adrouter/ai -- adrouter.test.ts: passed, 26 tests
- git diff --check: passed

### Findings / Notes

- The standalone CLI gate validates its vendored digest and generated parity without requiring the
  sibling Router checkout. Cross-repository parity is an additional source-supplied check.

---

## Step B: Remove models.json behavior and lock the default registry

### Status

complete

### Objective

Make the official CLI catalog immutable and AdRouter-only while preserving explicit in-memory
provider injection for SDK and test harnesses.

### Tasks

- [ ] Replace ModelRegistry.create(authStorage, modelsJsonPath) with an official locked
      ModelRegistry.create(authStorage) that loads exactly ADROUTER_MODELS.
- [ ] Remove models.json schemas, parsing, file access, reload state, merge precedence, custom
      provider/model overrides, endpoint/header/API-key resolution, error state, and auth-source
      labels from model-registry.ts.
- [ ] Keep ModelRegistry.inMemory and programmatic registerProvider/unregisterProvider behavior for
      explicitly injected SDK/test registries.
- [ ] Make registerProvider/unregisterProvider unavailable or fail with a bounded typed error on
      locked official registries; they must never change the official catalog.
- [ ] Remove the modelsJsonPath option and default path from SDK and agent-session service creation.
- [ ] Preserve the modelRegistry injection option so SDK callers/tests can supply an in-memory
      registry deliberately.
- [ ] Remove getModelsPath from packages/coding-agent/src/config.ts and all active callers.
- [ ] Remove startup/reload warning surfaces from list-models, model-selector, interactive-mode, and
      OAuth selector.
- [ ] Replace resolver/help/logout wording that tells users to add providers, credentials, commands,
      or models through models.json.
- [ ] Remove config migration behavior and tests whose only purpose is preserving executable
      models.json semantics; retain assertions that an existing file is untouched.
- [ ] Replace the large models.json behavior matrix with focused locked-registry and injected-SDK
      behavior tests.
- [ ] Add a structured malicious-file case containing a fake provider, duplicate altered AdRouter
      model, attacker base URL, custom headers, API key, and embedded auth material.
- [ ] Add a separate invalid-JSON case.
- [ ] For both cases, prove the file bytes and existence are unchanged, no warning is emitted, and
      official IDs, order, modes, defaults, limits, endpoint selection, auth headers, and request
      body remain unaffected.
- [ ] Preserve normal explicit custom/loopback endpoint configuration and official installation
      authentication; only models.json influence is removed.
- [ ] Update SDK comments and public types so they accurately describe the new default registry and
      the explicit injection seam.
- [ ] Search active source and user documentation for residual executable models.json paths or
      guidance and classify historical-only references.

### Relevant Files

- packages/coding-agent/src/core/model-registry.ts
- packages/coding-agent/src/core/sdk.ts
- packages/coding-agent/src/core/agent-session-services.ts
- packages/coding-agent/src/core/model-resolver.ts
- packages/coding-agent/src/config.ts
- packages/coding-agent/src/cli/list-models.ts
- packages/coding-agent/src/modes/interactive/components/model-selector.ts
- packages/coding-agent/src/modes/interactive/components/oauth-selector.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/test/model-registry.test.ts
- packages/coding-agent/test/config-value-migration.test.ts
- packages/coding-agent/test/oauth-selector.test.ts
- packages/coding-agent/test/sdk-stream-options.test.ts
- packages/coding-agent/test/sdk-openrouter-attribution.test.ts
- packages/coding-agent/test/suite/regressions/5661-uppercase-header-values.test.ts

### Expected Changes

- modify: packages/coding-agent/src/core/model-registry.ts
- modify: default SDK/session registry wiring and comments
- delete: executable models.json parser/schema/helpers and their dead imports
- delete: active models.json warnings, refresh actions, and guidance
- replace: models.json behavior tests with locked-registry, untouched-file, and injected-registry tests
- modify only where provider injection is explicitly supplied: SDK/test harnesses

### Do Not Modify

- Existing user models.json files outside test fixtures
- AuthStorage persisted-state format
- settings.json/session formats or workspace-trust behavior
- Official installation proof, refresh rotation, or logout cleanup
- Custom/loopback endpoint support exposed through existing explicit configuration
- Generated model files by hand

### Commands

~~~bash
npm test --workspace @adrouter/cli -- model-registry.test.ts
npm test --workspace @adrouter/cli -- config-value-migration.test.ts
npm test --workspace @adrouter/cli -- oauth-selector.test.ts
npm run check:ts-imports
rg -n "models\.json|modelsJson|getModelsPath" packages/coding-agent/src packages/coding-agent/test
~~~

### Acceptance Criteria

- [ ] Official ModelRegistry.create exposes only provider adrouter and the exact generated eight
      models.
- [ ] Default SDK/session services never compute, open, parse, watch, or reload models.json.
- [ ] Existing files remain byte-identical and produce no startup, list, selector, reload, logout,
      or doctor warning.
- [ ] Malicious and invalid files cannot affect catalog, limits, thinking, endpoint, headers, auth,
      or request content.
- [ ] Explicitly injected in-memory SDK/test registries retain provider registration behavior.
- [ ] Locked registries cannot be mutated through programmatic or extension paths.
- [ ] Normal explicit custom/loopback endpoint behavior remains covered and unchanged.
- [ ] Active source contains no executable models.json behavior.

### Validation Results

- npm test --workspace @adrouter/cli -- model-registry.test.ts: passed
- npm test --workspace @adrouter/cli -- config-value-migration.test.ts: passed
- npm test --workspace @adrouter/cli -- oauth-selector.test.ts: passed
- npm run check:ts-imports: passed
- active models.json search: passed; only inert test fixtures and historical PLAN/changelog text remain

### Findings / Notes

- Historical changelog and attribution text does not constitute executable behavior and need not be
  rewritten merely to eliminate every textual occurrence.

---

## Step C: Retire provider-registering bundled features and harden packaged runtime

### Status

complete

### Objective

Ensure the shipped CLI contains no extension or packaged code path that can read/write models.json
or register an alternate provider, while retaining explicit SDK/test injection.

### Tasks

- [ ] Remove registerProvider and unregisterProvider from the official ExtensionAPI types, loader,
      runner, and default agent-session runtime wiring.
- [ ] Migrate internal tests that need synthetic providers to construct and inject
      ModelRegistry.inMemory before creating the session.
- [ ] Add official-runtime tests proving an extension cannot register, replace, or unregister the
      AdRouter provider.
- [ ] Delete the active packaged source directories
      packages/coding-agent/bundled/pi-cache-optimizer-2.6.16 and
      packages/coding-agent/bundled/pi-opencode-bridge-0.2.1.
- [ ] Remove both features from packages/coding-agent/src/core/bundled-features.ts and
      packages/coding-agent/BUNDLED_SOURCES.json.
- [ ] Update branding, registry-install, package-smoke, release-readiness, shrinkwrap, resource
      loader, bundled state-path, footer-width, and runtime-event checks that currently require the
      retired bundles.
- [ ] Preserve historically accurate changelog or third-party notice text; remove current inventory
      claims only when they would otherwise describe files no longer shipped.
- [ ] Update scripts/verify-installed-runtime.mjs to derive exact IDs and metadata from the vendored
      catalog instead of a hand-written list.
- [ ] In installed-runtime verification, create an isolated agent directory containing the
      structured malicious models.json case and assert exact offline listing, request construction,
      no warning, and unchanged bytes.
- [ ] Repeat installed verification with invalid JSON and the same no-read/no-warning assertions.
- [ ] Verify packaged file inventory contains neither retired extension directory nor executable
      models.json logic.
- [ ] Keep source/provider catalogs for non-AdRouter APIs only where required by the internal AI SDK;
      prove the official CLI registry cannot enumerate them.
- [ ] Add an unreleased changelog note describing intentional removal of models.json and official
      provider-registering extensions without changing package versions.

### Relevant Files

- packages/coding-agent/src/core/extensions/types.ts
- packages/coding-agent/src/core/extensions/loader.ts
- packages/coding-agent/src/core/extensions/runner.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/agent-session-services.ts
- packages/coding-agent/src/core/bundled-features.ts
- packages/coding-agent/BUNDLED_SOURCES.json
- packages/coding-agent/bundled/pi-cache-optimizer-2.6.16/
- packages/coding-agent/bundled/pi-opencode-bridge-0.2.1/
- packages/coding-agent/test/extensions-runner.test.ts
- packages/coding-agent/test/agent-session-dynamic-provider.test.ts
- packages/coding-agent/test/resource-loader.test.ts
- packages/coding-agent/test/bundled-state-paths.test.ts
- scripts/verify-installed-runtime.mjs
- scripts/verify-registry-install.mjs
- scripts/check-adrouter-branding.mjs
- scripts/check-release-readiness.mjs

### Expected Changes

- modify: official extension API and runtime wiring
- modify: tests to use explicitly injected in-memory registries
- delete: packages/coding-agent/bundled/pi-cache-optimizer-2.6.16/
- delete: packages/coding-agent/bundled/pi-opencode-bridge-0.2.1/
- modify: current bundled-feature and source inventories
- modify: package/readiness/installed-runtime verification
- modify: unreleased coding-agent changelog

### Do Not Modify

- Provider injection on explicitly constructed in-memory registries
- General extension commands, events, themes, skills, or non-provider APIs
- Historical release entries merely mentioning retired behavior
- Package versions, lockfile versions, workflows, npm state, or GitHub releases
- User files or personal CLI state during tests

### Commands

~~~bash
npm test --workspace @adrouter/cli -- extensions-runner.test.ts
npm test --workspace @adrouter/cli -- resource-loader.test.ts
npm run check:branding
npm run check:shrinkwrap
npm run check:release-readiness
node scripts/verify-installed-runtime.mjs
~~~

### Acceptance Criteria

- [ ] The packaged CLI contains neither retired bundle.
- [ ] Official extensions cannot register or override providers.
- [ ] SDK/test provider injection works only through an explicitly supplied in-memory registry.
- [ ] Installed offline listing contains exactly the eight AdRouter models.
- [ ] Structured malicious and invalid models.json files remain byte-identical and silent in the
      installed runtime.
- [ ] Packaged request construction ignores attacker endpoint, headers, auth, model, limits, and
      thinking values.
- [ ] Bundle inventories, shrinkwrap, smoke, branding, and readiness checks reflect actual packaged
      content.
- [ ] No version, release-channel, or workflow change is introduced.

### Validation Results

- npm test --workspace @adrouter/cli -- extensions-runner.test.ts: passed
- npm test --workspace @adrouter/cli -- resource-loader.test.ts: passed
- npm run check:branding: passed through npm run check
- npm run check:shrinkwrap: passed; shrinkwrap unchanged and current
- npm run check:release-readiness: passed
- node scripts/verify-installed-runtime.mjs: passed through node scripts/ci-package-smoke.mjs

### Findings / Notes

- Removing current bundled-source inventory entries is required for package truthfulness; rewriting
  unrelated historical notices is not.

---

## Step D: Restore the safe full-width sponsor panel

### Status

complete

### Objective

Render sponsorship as the intended highlighted terminal panel with safe hyperlinks, bounded
wrapping, correct narrow-width behavior, and reliable stale-row clearing while preserving sponsor
privacy and settlement semantics.

### Tasks

- [ ] Use the existing sponsoredFooterHighlight theme token for every non-NONE sponsor row; do not
      add another color or dependency.
- [ ] Sanitize ANSI escapes, C0/C1 controls, carriage returns, newlines, and tabs from title, body,
      label, CTA, and URL before applying styles or measuring width.
- [ ] For non-NONE sponsorship, render a full-width padded block:
      first row is italic Sponsored by: followed by a bold sanitized title; body is normal text;
      final row is the sanitized literal URL.
- [ ] Use Sponsored as the missing/empty title fallback.
- [ ] Wrap the body to at most three visual lines and ellipsize the final visible line when content
      is truncated.
- [ ] Do not render the CTA field in the redesigned panel.
- [ ] Validate URL with the platform URL parser after sanitization. Permit only http or https,
      reject credentials, control characters, invalid URLs, and every other scheme.
- [ ] Underline the literal visible URL. When getCapabilities().hyperlinks is true, use the TUI
      hyperlink helper to wrap that same visible URL with an OSC-8 target; otherwise render the same
      visible URL without OSC-8.
- [ ] Omit unsafe URLs entirely and never emit them in an OSC sequence.
- [ ] For every positive width, keep at least three highlighted rows: title, one body row, and one
      URL row. Use a blank highlighted row when optional body or URL content is absent.
- [ ] Return no rows for width zero. At widths 1, 2, 3, and other narrow widths, clip or ellipsize
      safely without splitting terminal control sequences or exceeding visible width.
- [ ] Preserve atomic latest-event state replacement and requestRender so off, degraded, empty,
      NONE-clearing, and shorter updates cannot leave prior sponsor rows visible.
- [ ] Preserve the existing neutral three-line guardrail/privacy-protected NONE display.
- [ ] Preserve clearing for ads disabled/off, degraded routing, no ad/inventory, and non-displayable
      NONE states.
- [ ] Add a higher-level TUI regression that renders a long panel followed by a shorter/empty panel
      and proves stale physical rows are cleared.
- [ ] Add sentinel tests across AI transport and session serialization proving sponsor title, body,
      CTA, URL, IDs, and placement never reach messages, assistant output, tools, commands,
      approvals, edits, or compaction. Existing settlement display/accounting entries may persist
      locally but must remain excluded from model context.
- [ ] Do not change sponsor selection, ad-first stream ordering, impression/click handling, or
      settlement.

### Relevant Files

- packages/coding-agent/src/modes/interactive/components/adrouter-ad-panel.ts
- packages/coding-agent/test/adrouter-ad-panel.test.ts
- packages/coding-agent/test/footer-width.test.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/modes/interactive/theme/theme.ts
- packages/coding-agent/src/modes/interactive/theme/dark.json
- packages/coding-agent/src/modes/interactive/theme/light.json
- packages/tui/src/
- packages/ai/test/adrouter.test.ts
- Relevant session/compaction sponsor-isolation tests

### Expected Changes

- modify: packages/coding-agent/src/modes/interactive/components/adrouter-ad-panel.ts
- modify: focused sponsor panel and terminal-width tests
- modify: sponsor-isolation transport/session tests
- modify only if stale-row integration requires it: interactive-mode rendering tests
- no theme-value change expected

### Do Not Modify

- Sponsor selection, inventory, settlement, billing, or click policy
- AdRouter network event shapes
- Theme colors outside existing sponsoredFooterHighlight use
- General footer layout or unrelated terminal components
- Provider messages, tool context, session schema, or compaction algorithms

### Commands

~~~bash
npm test --workspace @adrouter/cli -- adrouter-ad-panel.test.ts
npm test --workspace @adrouter/cli -- footer-width.test.ts
npm test --workspace @adrouter/ai -- adrouter.test.ts
npm run profile:tui
~~~

### Acceptance Criteria

- [ ] Full, partial, missing-field, and unsafe payloads render according to the specified layout.
- [ ] Hyperlink-capable terminals receive a valid OSC-8 link; fallback terminals show the identical
      visible URL without OSC-8.
- [ ] Unsafe schemes, credentials, controls, and invalid URLs are never emitted as links.
- [ ] Body wrapping is capped at three visual lines with correct ellipsis.
- [ ] Widths 0, 1, 2, 3, narrow Unicode, and control-containing inputs remain bounded and safe.
- [ ] Long-to-short, sponsor-to-NONE, sponsor-to-off, and sponsor-to-empty transitions leave no
      stale rows.
- [ ] Guardrail/privacy NONE remains neutral rather than sponsor-highlighted.
- [ ] Sponsor sentinels remain absent from every model/tool/compaction surface; permitted local
      settlement accounting remains context-excluded.
- [ ] Selection, stream ordering, and settlement tests remain unchanged and pass.

### Validation Results

- npm test --workspace @adrouter/cli -- adrouter-ad-panel.test.ts: passed, including differential rendering
- npm test --workspace @adrouter/cli -- footer-width.test.ts: passed
- npm test --workspace @adrouter/ai -- adrouter.test.ts: passed, 26 tests
- npm run profile:tui -- --isolated-agent-dir --skip-build --profile-dir <temporary>: passed, 1433.8 ms

### Findings / Notes

- Git history is a visual/behavior reference only; do not restore old files wholesale or reintroduce
  their removed behavior.

---

## Step E: Add the canonical product guide and generated documentation checks

### Status

complete

### Objective

Give users and maintainers one accurate explanation of the product contract and make documentation
drift fail against the vendored Router catalog.

### Tasks

- [ ] Create docs/about.md as the canonical product explanation.
- [ ] Explain that AdRouterCLI is a terminal coding agent using the hosted Router provider while
      local tools run within workspace trust and command/mutation approval boundaries.
- [ ] Separate Router responsibilities from CLI responsibilities.
- [ ] Document the exact eight models in canonical order, their thinking levels/defaults,
      descriptions, and the fixed 131072 / 126976 / 4096 limits.
- [ ] Document offline listing with adrouter --offline --list-models adrouter.
- [ ] Document browser-first installation authentication, comparison-code approval, hosted
      installation proof, rotating credentials, and the separate explicit custom/loopback bearer
      boundary.
- [ ] Explain the sponsor panel, /ads controls, ads-off behavior, and strict sponsor/model context
      isolation.
- [ ] Explain the streamed lifecycle in order:
      ad, thinking/text/tool_call events, final settlement, then done, with no automatic replay
      after partial paid-stream consumption.
- [ ] Document install, doctor, and /logout adrouter behavior.
- [ ] State exactly what the CLI sends to Router:
      selected model, thinking level, maximum output; permitted system/user/assistant/tool context;
      trusted project instructions; tool schemas/results; client identity metadata; workspace path
      from process.cwd() or supported override; ad mode/enabled/minimum-tier metadata; and
      installation proof/access headers.
- [ ] State what remains local:
      installation private key and refresh token.
- [ ] State that the returned sponsor payload is separate presentation/accounting data and is never
      sent to a provider/model or stored in messages, tools, edits, sessions, or compaction.
- [ ] Link README.md, relevant package READMEs, and the bundled AdRouterCLI skill to docs/about.md.
      Use the canonical GitHub URL where a packaged artifact cannot resolve a repository-relative
      link.
- [ ] Refactor scripts/check-docs.mjs to read and validate the vendored artifact rather than
      hard-coding model IDs.
- [ ] Check exact IDs, order, modes, defaults, descriptions, and limits in docs/about.md and exact
      links from required entry documents.
- [ ] Fail active product docs containing models.json instructions or provider-registration
      guidance; exclude historical changelogs and attribution/provenance records.
- [ ] Update scripts/verify-installed-runtime.mjs and packages/ai/test/adrouter.test.ts to derive
      expected catalog data from the vendored artifact if Step A has not already completed that
      conversion.
- [ ] Add an unreleased product changelog entry covering canonical catalog sync, official
      AdRouter-only behavior, sponsor panel changes, and docs without changing version metadata.

### Relevant Files

- docs/about.md
- README.md
- packages/ai/README.md
- packages/coding-agent/README.md
- packages/coding-agent/bundled/adroutercli/skills/adroutercli/docs/SKILL.md
- scripts/check-docs.mjs
- scripts/verify-installed-runtime.mjs
- packages/ai/test/adrouter.test.ts
- Active documentation under docs/ and packages/
- Unreleased package changelogs

### Expected Changes

- create: docs/about.md
- modify: root and relevant package README links
- modify: bundled AdRouterCLI skill documentation
- modify: scripts/check-docs.mjs
- modify if not completed earlier: installed-runtime and AI catalog assertions
- modify: unreleased changelog entries
- no historical documentation rewrite required

### Do Not Modify

- Historical release notes solely to erase prior behavior
- Third-party attribution text that remains historically accurate
- Authentication or streaming implementation
- Package versions, release metadata, workflows, tags, or hosted state
- Unrelated documentation topics

### Commands

~~~bash
npm run check:docs
rg -n "models\.json|registerProvider|unregisterProvider" README.md docs packages/coding-agent/README.md packages/ai/README.md packages/coding-agent/bundled/adroutercli
npm run catalog:check
~~~

### Acceptance Criteria

- [ ] docs/about.md accurately covers product purpose, trust, auth, catalog, limits, data flow,
      sponsor privacy, streaming lifecycle, doctor, install, and logout.
- [ ] Required entry documents link to the canonical guide.
- [ ] Documentation checks derive their expectations from the vendored artifact.
- [ ] Model IDs, order, descriptions, thinking behavior, and limits cannot drift silently.
- [ ] Active product docs contain no models.json or official provider-registration guidance.
- [ ] Historical changelog and attribution records remain accurate and exempt.
- [ ] Documentation and catalog checks pass without network access.

### Validation Results

- npm run check:docs: passed, 98 Markdown files
- active documentation search: passed; executable models.json and extension provider guidance absent
- npm run catalog:check: passed

### Findings / Notes

- The canonical guide describes source/current behavior. It must not claim npm publication or
  hosted deployment merely because local source is ready.

---

## Step F: Final verification and cleanup

### Status

complete

### Objective

Validate source, isolated tests, packaged runtime, documentation, terminal behavior, and
cross-repository catalog parity without publishing or deploying anything.

### Tasks

- [x] Re-run catalog sync against the exact Router artifact, then run the non-writing standalone
      catalog check.
- [x] Run focused AI, registry, SDK injection, extension-locking, bundle inventory, sponsor panel,
      sponsor-isolation, documentation, and installed-runtime tests.
- [x] Run the normal full repository gate and isolated test suite.
- [x] Run release-readiness as a read-only packaging validation; do not version, stage, publish, tag,
      or approve a workflow.
- [x] Run the production-faithful local install path with disposable test state where supported.
- [x] Verify installed adrouter --offline --list-models adrouter returns exactly the canonical eight
      IDs in order.
- [x] Verify installed adrouter --json doctor remains valid JSON, secret-free, and does not mention
      or inspect models.json.
- [x] Repeat installed malicious/invalid models.json checks and confirm file bytes are unchanged.
- [x] Review the final diff for hand-edited generated files, stale provider/model lists, executable
      models.json behavior, retired bundle residue, dependency/version/release changes, temporary
      files, and unrelated edits.
- [x] Remove temporary debugging code, generated test artifacts, unused imports, and stale comments.
- [x] Record the Router/CLI catalog digest and the exact Router commit used for synchronization.
- [x] Update PLAN.md statuses, validation results, findings, and skipped-command reasons.
- [x] Confirm the only pre-existing dirty change was the exact typo and that it is intentionally
      included/classified rather than silently overwritten.
- [x] Stop before commit, push, npm publication, Git tag, GitHub release, dist-tag movement,
      deployment, database mutation, or protected approval unless separately authorized.

### Relevant Files

- All files changed by Steps A-E
- packages/ai/catalog/adrouter-model-catalog.v1.json
- Generated packages/ai/src/providers/adrouter.models.ts
- PLAN.md

### Expected Changes

- modify: PLAN.md statuses, validation results, digest, Router commit, and findings during implementation
- remove: temporary implementation/test artifacts, if any
- no release, deployment, version, workflow, or hosted-state changes

### Do Not Modify

- Package versions or public release metadata
- npm/GitHub channels, Git tags, workflows, or hosted services
- Personal credentials, personal agent state, or user models.json
- Router repository after consuming its committed artifact
- Generated output outside the documented catalog generation path

### Commands

~~~bash
npm run catalog:check -- --source ../../router/backend/catalog/model-catalog.v1.json
npm run check
npm run test:isolated
npm run check:release-readiness
npm run check:local-install
node scripts/ci-package-smoke.mjs
adrouter --offline --list-models adrouter
adrouter --json doctor
git diff --check
git status --short --branch
~~~

### Acceptance Criteria

- [x] Router source artifact, CLI vendored artifact, generated constants, tests, offline listing,
      and docs share one digest and exact catalog.
- [x] Full check, isolated tests, readiness, focused suites, and installed-runtime verification pass.
- [x] Official runtime exposes only AdRouter; SDK/test injection remains available only when
      explicit.
- [x] Existing models.json files are untouched, silent, and behaviorally inert.
- [x] Retired bundles and official extension provider registration are absent from the package.
- [x] Sponsor rendering and privacy-isolation acceptance cases pass.
- [x] Doctor remains machine-readable and secret-free.
- [x] Final diff contains no dependency addition, context/compaction change, version, release,
      workflow, deployment, database, or unrelated change.
- [x] No temporary files, stale comments, or unintended generated artifacts remain.
- [x] Working-tree status and any pre-existing user work are reported accurately.

### Validation Results

- npm run catalog:check -- --source ../../router/backend/catalog/model-catalog.v1.json: passed
- npm run check: passed
- npm run test:isolated: passed outside the sandbox so localhost mock servers could bind; AI 514,
  agent 182, and CLI 1490 tests passed, with the TUI node:test suite also passing
- npm run check:release-readiness: passed
- npm run check:local-install: passed with a disposable global prefix
- node scripts/ci-package-smoke.mjs: passed; packaged command/resource and installed-runtime smokes passed
- installed offline model list: passed with both disposable custom-endpoint auth and a clean no-auth
  locked registry; exact Router order verified
- installed JSON doctor: passed as valid secret-free JSON with disposable state
- npm run profile:tui -- --isolated-agent-dir: passed using a temporary profile directory
- git diff --check: passed
- git status --short --branch: reviewed; only the planned implementation, intentional bundle
  deletions, generated catalog files, tests, documentation, and PLAN.md are dirty

### Findings / Notes

- install:local is validation of a local artifact, not permission to publish or mutate public
  channels.
- No unisolated global install was run. Local install and package smokes used disposable prefixes;
  no production, release, database, workflow, or channel mutation was performed.
- If a platform-specific acceptance case cannot run locally, record it as follow-up instead of
  claiming success.

---

## Step G: Prepare the immutable beta.18 release source

### Status

`in_progress`

### Objective

Move the verified implementation onto current remote main, synchronize the next unused beta
version and release metadata, and produce one clean reviewed release commit without changing
runtime behavior.

### Tasks

- [x] Re-query npm dist-tags, exact beta.17 publication, remote main, and beta.17 tag state.
- [x] Determine that beta.17 is immutable and select `0.81.0-beta.18`.
- [ ] Restore valid GitHub CLI authentication with repository write/workflow permission.
- [ ] Confirm the protected `npm-publish` environment has a current scoped `NPM_TOKEN`; do not
      print, copy, or store the token locally.
- [ ] Commit the completed implementation on its existing branch so none of the verified work is
      lost or mixed with unrelated changes.
- [ ] Create `codex/release-0.81.0-beta.18` from current remote main and apply the implementation
      commit, resolving only the known squash-merge ancestry difference.
- [ ] Update the root and four workspace versions, internal exact dependency pins, package lock,
      coding-agent shrinkwrap, README source-verification examples, changelog release heading, and
      `release-manifest.json` to beta.18 with beta.17 as `supersedes`.
- [ ] Regenerate only documented deterministic release inputs and verify no runtime source changes
      were introduced by version preparation.
- [ ] Commit and push the release branch, open a pull request, wait for all six-platform CI jobs,
      and merge only if every required check is green.

### Relevant Files

- `package.json`
- `package-lock.json`
- `packages/*/package.json`
- `packages/coding-agent/npm-shrinkwrap.json`
- `packages/coding-agent/docs/CHANGELOG.md`
- `README.md`
- `release-manifest.json`
- `PLAN.md`

### Expected Changes

- modify: synchronized version and exact internal dependency metadata
- modify: beta.18 changelog/README/release manifest metadata
- no runtime behavior change after the already verified implementation commit

### Do Not Modify

- `.github/workflows/`
- Router, WebUI, database, deployment, hosted secrets, or production state
- npm or GitHub public channels during source preparation

### Commands

~~~bash
gh auth status --hostname github.com
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
git diff --check
~~~

### Acceptance Criteria

- [ ] Release source is based on current remote main and contains the complete verified implementation.
- [ ] Every package, dependency pin, lockfile, shrinkwrap, README, changelog, and manifest names beta.18.
- [ ] No beta.18 npm version or Git tag exists before staging.
- [ ] Full local gates and six-platform pull-request CI pass from the release commit.
- [ ] The merged remote main commit is exactly identified before tagging.

### Validation Results

- `npm view @adrouter/cli dist-tags`: passed; `candidate` is beta.17 and public `beta`/`latest` are beta.13
- `npm view @adrouter/cli@0.81.0-beta.17`: passed; immutable beta.17 exists
- `git ls-remote`: passed; remote main and beta.17 tag both point to `2d5344f82a775bcd89e38de18614d8a7eaf373ed`
- `gh auth status --hostname github.com`: blocked; saved GitHub token is invalid
- `npm whoami`: blocked; local npm client is unauthenticated, which is acceptable only if the
  protected workflow environment has its required token

### Findings / Notes

- The repository has no `RELEASE.md`; `docs/releasing.md` is the active release procedure.
- Node.js 25.9.0 is currently active. Release gates and workflow execution must use the documented
  Node.js 22.19.0 runtime.

---

## Step H: Tag and stage the beta.18 GitHub draft

### Status

`blocked`

### Objective

Create the protected immutable beta.18 tag from the merged release commit and let the tag workflow
build, attest, checksum, and stage the exact draft GitHub prerelease assets.

### Tasks

- [ ] Verify the checkout is clean and exactly matches merged remote main.
- [ ] Verify `v0.81.0-beta.18` is unused locally and remotely.
- [ ] Create and push the tag from the exact merged release commit.
- [ ] Wait for `Stage tagged release` and verify the draft asset inventory, checksums, SBOM,
      bundled-source inventory, third-party notices, artifact manifest, and attestations.
- [ ] Record the exact source commit, tag, tarball integrity, workflow run, and draft release URL.

### Relevant Files

- `.github/workflows/release-tag.yml`
- `release-manifest.json`
- staged GitHub draft assets

### Expected Changes

- create remotely: immutable `v0.81.0-beta.18` tag
- create remotely: draft beta.18 GitHub prerelease and attested assets

### Do Not Modify

- npm registry state
- public GitHub release visibility
- Router or any hosted deployment

### Commands

~~~bash
git status --short --branch
git ls-remote --tags origin refs/tags/v0.81.0-beta.18
gh run watch
gh release view v0.81.0-beta.18
~~~

### Acceptance Criteria

- [ ] Tag, merged main, artifact manifest, and tarball identify one exact commit/version.
- [ ] Tag workflow succeeds and the GitHub prerelease remains draft.
- [ ] Every required artifact and attestation is present and verified.
- [ ] No npm dist-tag has moved.

### Validation Results

- blocked pending valid GitHub authentication and completion of Step G

### Findings / Notes

- Pushing the tag is the only supported trigger for staging; do not create or upload release assets manually.

---

## Step I: Publish and accept the beta.18 npm candidate

### Status

`blocked`

### Objective

Publish the exact attested draft tarball under npm `candidate`, then collect the required redacted
two-cohort authentication acceptance evidence without moving public channels.

### Tasks

- [ ] Confirm the `npm-publish` protected environment reviewer and short-lived scoped `NPM_TOKEN` are ready.
- [ ] Dispatch `Promote staged release` with tag beta.18 and phase `publish-candidate`.
- [ ] Approve the protected environment only after the workflow identifies the exact tag and artifact.
- [ ] Verify npm metadata and integrity and anonymously install the exact candidate.
- [ ] On two distinct operator-controlled cohorts, complete the documented installation enrollment,
      signed profile/turn, streaming, refresh rotation, replay/tamper/token-without-key rejection,
      revocation, upgrade policy, and local cleanup matrix.
- [ ] Upload only the schema-valid redacted `authentication-acceptance.json` matching the tag,
      commit, and tarball integrity.

### Relevant Files

- `.github/workflows/promote-release.yml`
- `scripts/verify-npm-release.mjs`
- `scripts/validate-authentication-acceptance.mjs`
- draft release `authentication-acceptance.json` asset

### Expected Changes

- publish remotely: `@adrouter/cli@0.81.0-beta.18` under temporary `candidate`
- add remotely: redacted authentication acceptance asset after manual testing

### Do Not Modify

- npm `beta` or `latest`
- GitHub draft visibility
- credential-bearing local or release artifacts

### Commands

~~~bash
gh workflow run promote-release.yml -f tag=v0.81.0-beta.18 -f phase=publish-candidate
npm view @adrouter/cli@0.81.0-beta.18
npm view @adrouter/cli dist-tags
~~~

### Acceptance Criteria

- [ ] Candidate npm bytes and metadata exactly match the attested GitHub tarball.
- [ ] Anonymous installed-runtime verification passes for the exact candidate.
- [ ] Two distinct acceptance cohorts complete every required boolean check.
- [ ] Acceptance evidence is redacted, schema-valid, and exact-version bound.
- [ ] Public `beta`/`latest` and GitHub visibility remain unchanged until finalization.

### Validation Results

- blocked pending Step H, protected npm credentials, and manual two-cohort acceptance

### Findings / Notes

- Local npm login is neither required nor preferred when the protected workflow token is available.
- A failed immutable candidate must be deprecated and replaced with a higher beta.

---

## Step J: Final verification and cleanup

### Status

`todo`

### Objective

Run the protected finalization only after candidate acceptance, verify all six installed-runtime
platform jobs, promote npm channels, publish the GitHub prerelease, and leave the checkout at the
exact released commit.

### Tasks

- [ ] Dispatch the beta.18 `finalize-release` phase after the exact acceptance asset is present.
- [ ] Approve the protected environment only after acceptance validation succeeds.
- [ ] Wait for all six registry-install jobs and final npm/GitHub publication jobs.
- [ ] Verify npm `beta` and `latest` point to beta.18, `candidate` is removed, and beta.17 is
      deprecated with the recorded upgrade notice.
- [ ] Verify the GitHub beta.18 release is public, marked prerelease, and contains the exact staged assets.
- [ ] Anonymously install beta.18 and verify version, doctor JSON, catalog listing, dependency tree,
      bundled resources, reload/new behavior, and profile round trip.
- [ ] Leave the checkout clean at the exact immutable beta.18 tag/commit and record final remote state.
- [ ] Revoke the short-lived npm token after final verification if release operations no longer need it.

### Relevant Files

- `.github/workflows/promote-release.yml`
- `release-manifest.json`
- npm and GitHub public release records
- `PLAN.md`

### Expected Changes

- move remotely: npm `beta` and `latest` to beta.18; remove `candidate`
- publish remotely: GitHub beta.18 prerelease
- deprecate remotely: superseded beta.17 with the manifest's upgrade notice

### Do Not Modify

- package bytes, immutable tags, or staged assets after candidate publication
- Router, database, deployment, hosted auth, or production state

### Commands

~~~bash
gh workflow run promote-release.yml -f tag=v0.81.0-beta.18 -f phase=finalize-release
node scripts/verify-npm-release.mjs --state final
npm view @adrouter/cli dist-tags
gh release view v0.81.0-beta.18
git status --short --branch
~~~

### Acceptance Criteria

- [ ] Acceptance validation and all six installed-runtime jobs pass.
- [ ] npm final tags, deprecation, package integrity, and metadata match the release manifest.
- [ ] GitHub prerelease is public with verified exact assets and attestations.
- [ ] Anonymous beta.18 installation passes the documented runtime contract.
- [ ] Checkout is clean at the exact released tag/commit and no credential or temporary artifact remains.

### Validation Results

- not run; depends on candidate publication and operator-controlled acceptance

### Findings / Notes

- The user authorized npm/GitHub release publication, not Router or production deployment.

---

## Follow-up Work

- Decide version number, immutable candidate, protected workflow, npm dist-tags, GitHub release, and
  public promotion in a separate explicitly authorized release plan.
- Run the documented cross-platform terminal/authentication acceptance matrix before public
  promotion.
- After a later Router deployment, compare hosted /v1/models with the same Router source artifact;
  local digest parity alone does not prove hosted deployment state.
- Coordinate Desktop Agent or other clients only through their independently owned plans if they
  consume the Router catalog.

## Decision Log

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-08-02 | Replace the beta.17 release plan | The user explicitly requested a detailed plan for the remaining implementation | In-progress publication work is superseded and no release action is authorized |
| 2026-08-02 | Remove only the exact stray s before implementation | The existing dirty file contains a classified one-character typo | User work is preserved and the future feature diff starts from valid syntax |
| 2026-08-02 | Vendor the Router v1 artifact and generate locally | Router is the canonical model source while CLI CI must remain standalone | Catalog drift is detectable by digest and byte comparison without hosted access |
| 2026-08-02 | Lock official runtime to AdRouter and eight models | User selected SDK/test-only provider injection | models.json and extensions cannot alter official providers; explicit injected registries remain useful |
| 2026-08-02 | Retire cache optimizer and OpenCode bridge bundles | Both expose behavior excluded from the official product contract | Packaged code no longer reads/writes models.json or registers alternate providers |
| 2026-08-02 | Render URL instead of CTA in the sponsor panel | The requested design uses a visible, verifiable destination | Safe HTTP(S) hyperlinks have consistent capability fallback |
| 2026-08-02 | Keep a minimum three-row highlighted sponsor block | Stable height supports visual intent and reliable stale-row clearing | Missing body/URL values produce blank highlighted rows rather than layout collapse |
| 2026-08-02 | Preserve local settlement display/accounting entries while excluding them from context | The user's persistence choice supersedes the earlier blanket saved-data prohibition | Replay cards and cumulative subsidy can persist locally without entering messages, tools, or compaction |
| 2026-08-02 | Preserve all limits, compaction, auth, streaming, and release state | Those systems are explicitly outside this consolidation | The work remains a catalog/runtime/UI/docs change with no capacity or deployment mutation |
| 2026-08-02 | Release the completed implementation through the protected npm/GitHub workflow | The user explicitly authorized npm and GitHub publication after implementation | Release preparation may update beta metadata and perform protected remote release actions, but not Router or production deployment |
| 2026-08-02 | Use beta.18 instead of beta.17 | npm beta.17 and its Git tag are already immutable | The release fixes forward with the next unused beta and leaves beta.17 untouched |
| 2026-08-02 | Treat the requested GitHub/npm release as public beta promotion | Publication requires the repository's candidate, two-cohort acceptance, six-platform verification, and finalization gates | `candidate` is staged first; `beta`, `latest`, and GitHub visibility move only after every gate passes |
