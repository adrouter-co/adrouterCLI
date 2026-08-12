# Pi 0.84.1 adaptation ledger

AdRouterCLI reviewed Pi `v0.84.1` at commit
`53fa77ccd8a279eb87e92294ef3687b03ff80112`. The exact source archive, npm tarball,
integrities, and repository location are frozen in `upstreams.lock.json`. This is a controlled source
sync, not a wholesale package replacement: AdRouter's hosted identity, Router protocol, model
catalog, approvals, local state, sponsor isolation, and release policy remain authoritative.

## Adopted

| Area | 0.84.1 behavior retained in AdRouterCLI | Local evidence |
| --- | --- | --- |
| Schema validation | TypeBox 1.3.7 and union coercion that first accepts already-valid arms, preserving nullable values | `packages/ai/src/utils/validation.ts`, `packages/ai/test/validation.test.ts` |
| Agent lifecycle | Reject reset during an active run and propagate a blocked tool call's explicit terminate result | `packages/agent/src/agent.ts`, `packages/agent/src/agent-loop.ts`, focused agent and coding-agent regressions |
| Extension lifecycle | Track extension-owned event-bus subscriptions, reject stale APIs, and remove listeners on reload/disposal | `packages/coding-agent/src/core/extensions/loader.ts`, issue-7193 regression |
| Provider headers | Preserve nullable deletion markers while resolving request auth; strip markers only at summarization interfaces that still accept string-only maps | `packages/coding-agent/src/core/model-registry.ts`, `packages/coding-agent/src/core/agent-session.ts` |
| TUI correctness | Terminal spacing marks, OSC8 closure, batched color replies, progress clear, and iTerm image metadata fixes | `packages/tui/src/utils.ts`, terminal and image tests |
| Cross-platform paths | Normalize Windows shell paths and relativize find results against POSIX or Windows roots | `packages/coding-agent/src/utils/paths.ts`, find/path regressions |

## Existing local equivalents

These upstream themes were reviewed but did not require importing their product surface:

- Provider request and response hooks already exist as AdRouter extension events and remain inside
  the existing approval, redaction, and hosted-auth pipeline.
- Incremental assistant updates already use bounded event streams. The public JSON/RPC transport
  retains its current partial-snapshot compatibility contract instead of adopting a delta-only wire
  format that would break existing clients.
- Session ownership, compaction, branch summaries, and workspace resource loading already have
  AdRouter-specific implementations and tests.
- The official hosted model catalog remains generated from
  `packages/ai/scripts/generate-models.ts`; no upstream provider catalog is imported.

## Adapted

- Request-header deletion is accepted for mutable SDK providers, but official hosted requests still
  obtain credentials exclusively through installation auth and fresh DPoP-style proofs.
- Extension reload now invalidates the old runtime after its shutdown event, preserving cleanup
  while preventing listener leaks and stale API calls.
- Upstream terminal and filesystem fixes were ported onto the existing AdRouter TUI overlay and
  tool-authorization implementation rather than replacing those subsystems.
- TypeBox was advanced in all three consuming package manifests and the monorepo lockfile while the
  four AdRouter package versions remain in exact release lockstep.

## Deferred

- Remote client/server and protocol packages
- Harness-v2 and repository product APIs
- Fullscreen product-mode replacement
- Deferred-response product behavior
- Dynamic provider catalogs and discovery product surfaces

These can be evaluated in later waves only with a concrete AdRouter use case and compatibility
tests. Their absence does not block the 0.84.1 correctness sync.

## Rejected

- Credential export or migration from other provider stores
- Self-update or runtime source download
- Telemetry egress or new background network authority
- Hosted provider registration outside the generated AdRouter catalog
- Any change to `/v1/agent/turn`, `/v1/profile`, installation proofs, sponsor isolation, or paid
  request replay policy

## Validation contract

Every future refresh must update `upstreams.lock.json`, reconstruct this ledger against the newly
frozen source, run focused package tests, then pass `npm run upstream:check` and `npm run check`.
Manual candidate acceptance still covers hosted sign-in, streaming, tools, sponsor display, logout,
and cross-platform terminal behavior before any separately authorized release action.
