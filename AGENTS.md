# AdRouterCLI project instructions

## Scope and repository boundary

This directory is the independent public-source repository for AdRouterCLI. Its canonical GitHub
repository is `adrouter/adrouterCLI`; do not mix its commits, lockfile, or release state with sibling
projects in `adrouter_release/`.

Before editing, read `README.md`, `PLAN.md`, `SECURITY.md`, and `docs/releasing.md`, then run
`git status --short`. Treat `package.json`, `release-manifest.json`, and the release workflows as
authoritative when prose and implementation differ.

## File structure

- `packages/ai/` — private `@adrouter/ai` provider, authentication, model, and transport layer.
- `packages/agent/` — private `@adrouter/agent-core` harness, sessions, compaction, and tools.
- `packages/tui/` — private `@adrouter/tui` terminal rendering primitives.
- `packages/coding-agent/` — public `@adrouter/cli` executable and profiles command; its release
  tarball embeds the three exact-version private workspaces above.
- `scripts/` — build, public-boundary, package, registry, provenance, and release-policy checks.
- `.github/workflows/` — CI, audit, immutable tagged release, and protected promotion workflows.
- `docs/` — architecture, configuration, privacy, support, and maintainer/release documentation.
- `release-manifest.json` — version, npm tags, platform matrix, and blocked native artifacts.
- `images/` — checked-in documentation/brand assets. Generated `dist/`, coverage, tarballs, and
  temporary install output are not source.

## Stack

- Node.js `>=22.19.0`, npm workspaces, TypeScript ESM, and the root `package-lock.json`.
- Biome for formatting/linting, `tsgo` for typechecking/builds, Vitest and Node test runner for tests,
  and esbuild/Bun only where existing build scripts explicitly use them.
- A custom terminal UI and Pi-derived coding-agent runtime with public attribution preserved.
- Four workspaces version in lockstep, but only `@adrouter/cli` is public. Never publish
  `@adrouter/ai`, `@adrouter/agent-core`, or `@adrouter/tui` separately.

## Current npm and GitHub deployment stage

Last publicly verified on 2026-07-27:

- Source/release version: `0.81.0-beta.6`.
- npm: `@adrouter/cli@0.81.0-beta.6` is public; both `beta` and `latest` resolve to it. There is no
  stable release yet.
- GitHub: `adrouter/adrouterCLI` is public on `main`; `v0.81.0-beta.6` is a published prerelease.
- npm on Node.js is the supported distribution for macOS, Linux, and Windows arm64/x64. Every
  standalone native archive remains blocked by `release-manifest.json`; do not advertise one.

Remote state can change after this dated snapshot. Recheck before making a release claim:

```sh
npm view @adrouter/cli version dist-tags --json
gh release view v0.81.0-beta.6 --repo adrouter/adrouterCLI
```

The release path is `release-tag.yml` followed by the protected `promote-release.yml` candidate and
finalization phases. It must use the exact tagged tarball, pass anonymous installed-runtime checks
on all six supported OS/architecture targets, and only then move `beta`/`latest` and publish the
GitHub prerelease. Versions and tags are immutable; recover with a higher version. Do not publish,
tag, move dist-tags, alter GitHub releases, or configure remote secrets without explicit user
authorization.

## npm version and dist-tag policy

Keep these namespaces distinct: the immutable package version is a prerelease such as
`0.81.0-beta.6`, its GitHub tag is `v0.81.0-beta.6`, and its npm channel names are `candidate`,
`beta`, and `latest`. Never create numbered npm dist-tags such as `beta.6`; users who need a fixed
build install `@adrouter/cli@0.81.0-beta.6`, while `@beta` follows the moving beta channel.

While the package is prerelease/unstable, publish only under temporary `candidate`, complete every
registry gate, then move both `beta` and `latest` to the exact accepted version and remove
`candidate`. Never publish without an explicit safe tag because npm defaults to `latest`, and never
move `latest` before verification. At the first stable release, move only `latest` to stable and
leave `beta` on the newest accepted beta, as specified by `release-manifest.json` and
`docs/releasing.md`.

## Deployment authorization and authentication

When the user explicitly authorizes deployment of a specified version, carry the documented npm and
GitHub release through end to end without requesting confirmation for each normal step. This includes
the release PR/tag, protected workflows, npm candidate/final tags, GitHub prerelease, verification,
and temporary-secret cleanup. Pause only for interactive login/2FA, required environment approvals,
missing credentials, or a genuine release blocker that needs a user decision.

The user supplies authentication through interactive CLI/browser prompts or protected GitHub
environments; never ask them to send a secret in chat, and never read or print secret values. Follow
`docs/releasing.md` for exact names and roles. Staging credentials must be revocable and low-quota,
live only in `adrouter-staging`, and support all required model canaries. Temporary npm tokens must be
package-scoped, read/write, bypass-2FA enabled, valid for no more than seven days, stored only in
`npm-publish`, and revoked after verification. Use existing GitHub CLI authentication when it has
sufficient access; do not request unrelated provider keys or a GitHub PAT.

## Working rules and verification

- Keep sponsor data display-only and out of model, tool, command, edit, and compacted context.
- Preserve workspace trust, command approvals, bundled-source attribution, exact dependency pins,
  package allowlists, provenance, secret scans, and public-boundary checks.
- Do not edit generated `dist/`, packaged tarballs, coverage, or shrinkwrap output by hand; use the
  documented scripts.
- Use focused tests while iterating. The normal repository gate is `npm run check`; release work also
  requires the clean-checkout build, isolated tests, readiness check, and package smoke documented in
  `docs/releasing.md`.
