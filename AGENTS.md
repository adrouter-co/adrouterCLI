# AdRouterCLI repository instructions

## Scope and source map

This independent repository is the canonical AdRouter terminal coding agent and npm monorepo. Its
four public packages release in exact lockstep; do not mix its Git history, lockfile, or release
actions with sibling projects.

- `packages/` — provider/runtime, agent harness, terminal UI, and executable packages.
- `scripts/` — model generation, public-boundary/package validation, staged install, acceptance,
  and release helpers.
- `test/` and package-local tests — unit, integration, terminal, auth, and release-policy coverage.
- `.github/workflows/` — CI and protected candidate/promotion automation.
- generated `dist/`, coverage, package tarballs, and isolated install output are not source.

Before public/release changes, read `README.md`, `PLAN.md`, `SECURITY.md`, `RELEASE.md`, manifests,
workflows, and `git status --short --branch`. Use Node.js 22.19+ and the checked-in npm lockfile.

## Hosted identity and endpoint contract

- Official hosted sign-in creates an Ed25519 installation, opens
  `/developers?connect=cli#handoff=...`, displays a comparison code, waits for browser approval,
  and exchanges for short-lived access plus rotating refresh material.
- Every hosted `/v1/agent/turn` and `/v1/profile` request carries a fresh DPoP-style proof. Do not
  reintroduce hosted long-lived `adr_live_*` bearer-key instructions or use `/v1/turn`.
- CLI installation material is stored as mode-0600 file-protected local state and reported as
  `file_protected`; it is not an OS keychain or software-attestation claim.
- Sign-in UX is browser-first with native Done/Quit affordances. Preserve Open/Copy/Quit fallback,
  cancellation, retry cleanup, comparison-code binding, and redacted doctor output.
- Custom/loopback endpoints may explicitly use their supported bearer-key flow. Keep that boundary
  separate from official hosted installation auth.

## Models and product invariants

The hosted catalog is generated from `packages/ai/scripts/generate-models.ts`. Never hand-edit generated
`adrouter.models.ts` files; regenerate and verify all copies. Exact models are:

- `deepseek-v4-flash`, `deepseek-v4-pro`
- `mimo-v2.5`, `mimo-v2.5-pro`
- `agnes-2.0-flash`, `agnes-2.5-flash`
- `agnes-2.5-pro`, `agnes-2.5-pro-alpha`

Preserve the registry's per-model reasoning modes and the 131,072 total / 126,976 input / 4,096
output token contract. Do not restore old two-model or 1M-context assumptions.

- Keep sponsor/settlement data confined to the display panel and `/ads` controls. Never place it in
  prompts, assistant text, tools, command approvals, edits, or compacted sessions.
- Preserve workspace trust, project-local config gating, per-command/per-mutation approval,
  redaction, bounded streaming, no paid-request replay, local session ownership, and `/logout
  adrouter` cleanup.
- `adrouter --json doctor` must remain machine-readable and secret-free.

## Verification

Use focused tests while iterating; the normal repository gate is:

```sh
npm run check
```

`npm run install:local` is the production-faithful local install path. Development links are not
release evidence. Run model generation/checks after catalog changes and use the documented manual
candidate acceptance matrix for auth, streaming, tools, sponsor display, logout, and cross-platform
terminal behavior.

## Release channels and exact parity

Remote state was verified on 2026-08-01: source/tag `0.81.0-beta.16` and npm `candidate` point to
beta.16; public npm `beta` and `latest` remain `0.81.0-beta.13`; the beta.16 GitHub prerelease is a
draft. Re-query before making a current claim.

- Keep immutable package versions, Git tags, npm `candidate`, public `beta`/`latest`, and GitHub
  release state distinct. Never claim a candidate is public merely because it is installable.
- Build, tag, publish, and promote only from a clean committed tree. The four package manifests,
  lockfile, staged tarballs, Git tag, GitHub release, npm metadata, and local `HEAD` must identify
  the same version and exact source commit.
- After a completed public promotion, leave this checkout clean at the exact immutable tag/commit
  that produced the deployed artifact. If the default branch advances, prefer the deployed tag or
  exact detached commit over a newer source state.
- Publish prereleases under explicit `candidate`, complete automated and manual acceptance, then
  move approved public channels. Never rely on npm's default `latest`, move an immutable tag, or
  hand-edit generated release artifacts. Fix forward with a higher beta.
- Publishing, tagging, dist-tag moves, release edits, protected approvals, and remote-secret changes
  require explicit user authorization.
