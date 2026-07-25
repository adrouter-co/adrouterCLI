# Release and recovery procedure

Only `@adrouter/cli` is public. The exact-version `@adrouter/ai`,
`@adrouter/tui`, and `@adrouter/agent-core` workspaces remain private and must
be embedded as real nested packages through `bundleDependencies`.

Direct `npm pack` or `npm publish` from `packages/coding-agent` is unsupported
and fails intentionally. Build release artifacts only through the repository
staging scripts.

## Required pre-tag gates

From a clean checkout on Node.js 22.19 or newer:

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:release-readiness
node scripts/ci-package-smoke.mjs
```

The package smoke installs the staged tarball into a clean global prefix. It
requires `adrouter --json doctor` to classify the installation as deployable,
a clean npm dependency tree, all bundled feature contracts after startup,
`/reload`, and `/new`, and a reversible AdRouter profile round trip.

## Beta.5 candidate and promotion

Tag beta.5 only after the release commit and six-platform CI are green:

```sh
git tag v0.81.0-beta.5
git push origin v0.81.0-beta.5
```

The tag workflow builds and attests one staged npm tarball, its manifest, SBOM,
checksums, bundled-source inventory, and a draft GitHub prerelease.

The `Promote staged release` workflow has two manually approved phases:

1. `publish-candidate` downloads the exact draft tarball and manifest, publishes
   that tarball with npm provenance under the temporary `candidate` dist-tag,
   and verifies registry metadata and integrity. It never publishes directly
   under `beta` or `latest`.
2. `finalize-release` re-verifies the candidate, installs the exact version
   anonymously on macOS, Linux, and Windows (arm64 and x64), runs the installed
   runtime/reload/new/dependency/command/profile contracts, moves `beta` and
   `latest` to beta.5, removes `candidate`, deprecates beta.3, and makes the
   GitHub prerelease public.

No final dist-tag may move before all six installed-runtime jobs pass. npm
versions are immutable; a failed candidate is deprecated and replaced.
Both workflow phases are resumable: an exact candidate or already-final
publication is accepted, while an integrity, metadata, or conflicting-tag
mismatch fails closed.

## Release authentication

The GitHub repository must define two protected environments:

- `adrouter-staging` with `ADROUTER_STAGING_API_KEY`, containing only a
  staging AdRouter bearer token for the live canary;
- `npm-publish` with `NPM_TOKEN`, containing a short-lived npm granular access
  token with read/write permission limited to `@adrouter/cli` and bypass-2FA
  enabled for non-interactive publication, dist-tag, and deprecation commands.

Require a reviewer on `npm-publish`. Create the npm token immediately before
the release with a seven-day expiry, never print or commit it, and revoke it
after final verification. GitHub release creation and attestations use the
workflow-scoped `GITHUB_TOKEN`; no GitHub personal access token belongs in
repository secrets.

The maintainer pushing the release commit and tag must authenticate GitHub CLI
and git locally:

```sh
gh auth login --hostname github.com --git-protocol https --web
gh auth status --hostname github.com
git remote -v
```

The account must have repository write access, permission to create the
protected `v0.81.0-beta.5` tag, run workflows, and approve both environments.
Do not reuse npm, AdRouter, DeepSeek, or GitHub credentials for another role.

## Stable promotion

After beta.5 has run for at least 48 hours without a release blocker, require
one real packaged-user run on macOS, Linux, and Windows covering every bundled
extension, `/reload`, `/new`, and AdRouter profiles.

The stable `0.81.0` commit may contain version and release metadata changes
only. If any runtime code changes after beta.5, publish beta.6 and restart the
48-hour soak.

For stable, update `release-manifest.json` so:

- `githubPrerelease` is `false`;
- `finalTags.latest` is `0.81.0`;
- `finalTags.beta` remains `0.81.0-beta.5`;
- `candidateTag` remains `candidate`.

Also add `release.soak` with the beta version, an ISO `startedAt` timestamp at
least 48 hours old, and non-empty `cohortEvidence` references for `darwin`,
`linux`, and `windows`. Release readiness verifies the beta tag and rejects any
stable diff outside version, changelog, README, lockfile, and release-manifest
metadata. Behavior changes require another beta.

Repeat the exact two-phase candidate publication and six-platform installation
gates.
Promotion moves only `latest` to stable, leaves `beta` on beta.5, removes
`candidate`, and publishes a non-prerelease GitHub release.

## Recovery and security

Do not overwrite, reuse, or unpublish a released version. Deprecate a defective
version with an upgrade notice and publish the next version.

Release verification must run from a temporary directory with an empty npm
user config, the public registry explicitly selected, and the exact version
requested. Repository or maintainer `.npmrc` settings must not influence the
anonymous-user simulation.

Credentials must not be committed, echoed, or retained. The npm token is passed
only to candidate publication and final tag promotion; anonymous installation
jobs explicitly strip npm authentication. Third-party Actions stay pinned to
immutable commit SHAs. Standalone native archives remain blocked until each
target has matching-environment certification and required platform signing.
