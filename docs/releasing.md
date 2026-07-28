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

## Candidate and promotion

Tag only an unused manifest version after the release commit and six-platform CI are green. Published
versions and tags are immutable; replace a failed candidate with a higher version.

Routine CI runs the anonymous Windows registry check only when the exact source version has already
been published. This lets a new release pull request pass before its candidate exists. The protected
promotion workflow does not use that allowance: after candidate publication, a missing or mismatched
registry version remains a hard failure before any final dist-tag moves.

The tag workflow builds and attests one staged npm tarball, its manifest, SBOM,
checksums, bundled-source inventory, and a draft GitHub prerelease.

The `Promote staged release` workflow has two manually approved phases separated by exact-candidate
authentication acceptance:

1. `publish-candidate` downloads the exact draft tarball and manifest, publishes
   that tarball with npm provenance under the temporary `candidate` dist-tag,
   and verifies registry metadata and integrity. It never publishes directly
   under `beta` or `latest`.
2. On operator-controlled devices, install the exact candidate anonymously, complete enrollment,
   signed profile/turn, streaming, refresh rotation, replay/tamper/token-without-key rejection,
   revocation, upgrade policy, and local cleanup on the primary and required second distinct cohort.
   Upload only a schema-valid, redacted `authentication-acceptance.json` matching the tag, commit,
   tarball integrity, and `file_protected` storage classification. It contains boolean results and
   no credential-bearing free text.
3. `finalize-release` validates that acceptance asset, re-verifies the candidate, installs the exact version
   anonymously on macOS, Linux, and Windows (arm64 and x64), runs the installed
   runtime/reload/new/dependency/command/profile contracts, applies the manifest's
   final tags, removes `candidate`, deprecates the superseded version, and makes
   the GitHub release public.

No final dist-tag may move before all six installed-runtime jobs pass. npm
versions are immutable; a failed candidate is deprecated and replaced.
Both workflow phases are resumable: an exact candidate or already-final
publication is accepted, while an integrity, metadata, or conflicting-tag
mismatch fails closed.

## Release authentication boundaries

The GitHub repository must define two protected environments:

- `adrouter-staging`, optionally retained as a secret-free human reviewer gate for tagged staging;
- `npm-publish` with `NPM_TOKEN`, containing a short-lived npm granular access
  token with read/write permission limited to `@adrouter/cli` and bypass-2FA
  enabled for non-interactive publication, dist-tag, and deprecation commands.

No GitHub Actions job may receive an AdRouter profile or inference credential. Public health/model
checks may remain unauthenticated; installation authentication is user-approved and exercised only
on operator-controlled exact-candidate installations. Require a reviewer on `npm-publish`. Create the npm token immediately before
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
protected `v0.81.0-beta.9` tag, run workflows, and approve both environments.
Do not reuse npm, installation, provider, or GitHub credentials for another role.

## Stable promotion

After the accepted beta has run for at least 48 hours without a release blocker, require
one real packaged-user run on macOS, Linux, and Windows covering every bundled
extension, `/reload`, `/new`, and AdRouter profiles.

The stable commit may contain version and release metadata changes only. If any runtime code changes after the accepted beta, publish a higher beta and restart the
48-hour soak.

For stable, update `release-manifest.json` so:

- `githubPrerelease` is `false`;
- `finalTags.latest` is `0.81.0`;
- `finalTags.beta` remains the accepted beta;
- `candidateTag` remains `candidate`.

Also add `release.soak` with the beta version, an ISO `startedAt` timestamp at
least 48 hours old, and non-empty `cohortEvidence` references for `darwin`,
`linux`, and `windows`. Release readiness verifies the beta tag and rejects any
stable diff outside version, changelog, README, lockfile, and release-manifest
metadata. Behavior changes require another beta.

Repeat the exact two-phase candidate publication and six-platform installation
gates.
Promotion moves only `latest` to stable, leaves `beta` on the accepted beta, removes
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
