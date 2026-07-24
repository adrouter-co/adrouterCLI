# Release and recovery procedure

All four packages use one beta version and publish in this order:
`@adrouter/ai`, `@adrouter/tui`, `@adrouter/agent-core`, then
`@adrouter/cli`. The CLI is always last so no installable command is exposed
before its exact dependencies exist. A prerelease uses only the `beta` dist-tag;
it must never move `latest`.

## One-time public beta bootstrap

Before creating the first tag:

1. Create the GitHub `adrouter` organization, transfer the repository to
   `adrouter/adrouterCLI`, update local remotes, and confirm Actions and
   attestations run under that identity.
2. Apply the branch, immutable beta-tag, and environment protections in
   [repository settings](../.github/REPOSITORY_SETTINGS.md).
3. Create the npm `adrouter` organization, require publisher 2FA, add only the
   release maintainers, and reserve all four public package names.
4. Merge the release hardening and require a green six-platform CI run before
   creating `v0.81.0-beta.1`.
5. Run the one-time bootstrap workflow with the short-lived token. Approve the
   staged packages with human 2FA in dependency order and approve the CLI last.
6. Configure the four stage-only trusted publishers, then run the promotion
   workflow's `publish-github` phase.
7. Delete the bootstrap token and remove
   `.github/workflows/npm-bootstrap.yml` in a follow-up commit. Every later beta
   uses OIDC `stage-npm`, human 2FA approval, then `publish-github`.

If any artifact for the intended version already exists or differs in
integrity or metadata, do not replace it. Increment the beta number in lockstep
and restart from a new protected tag.

## Tag and draft

Create the immutable protected `vX.Y.Z-beta.N` tag only after the clean-checkout
build, check, full bundled-source readiness check, isolated test suite, audit,
signature audit, package dry-run, and six-platform matrix pass. The tag workflow
runs the semantic ads-off and ads-enabled canaries, creates the CycloneDX SBOM,
copies the bundled-source inventory and third-party notices, checksums all three,
attests each file separately, and creates an exact-inventory draft prerelease.

The bootstrap and promotion workflows accept the tag explicitly, check out that
tag, repeat the validation, and verify the draft plus all three attestations
before any npm registry operation.

## npm staging and human approval

Automation packs all four packages first and records each tarball's SHA-1,
SHA-512 integrity, byte size, name, and version. It submits prebuilt tarballs to
npm staging in dependency order and downloads every staged artifact again for
integrity and metadata comparison.

Approval is deliberately not described as atomic: npm stages and approves each
package separately. A maintainer performs 2FA approval in the same dependency
order and approves `@adrouter/cli` last. Publish the GitHub prerelease only after
all four public packages resolve to the tagged version under `beta`, none resolve
to it under `latest`, registry integrity and metadata match the recorded
artifact, and anonymous temporary-prefix installs pass on all six supported
platforms. Each install verifies `adrouter`, `adrouter-profile`, `--version`,
`--help`, JSON doctor output, and packaged runtime resources.

## Interrupted staging recovery

If staging or approval stops partway through:

1. Do not approve `@adrouter/cli`.
2. List and inspect every incomplete npm stage. Download its tarball instead of
   trusting the stage label.
3. Re-run the tag-bound staging workflow. It may resume only when every existing
   staged or published package matches the local tagged artifact's version,
   integrity, metadata, and beta tag, and existing artifacts form a dependency-
   ordered prefix.
4. Reject an incomplete stage only through a maintainer's 2FA-authenticated npm
   session.
5. On any integrity, metadata, order, or dist-tag mismatch, stop. Do not replace
   or overwrite the version; increment the beta number everywhere, create a new
   protected tag, and begin again.

For a client defect after approval, deprecate the affected beta, publish a new
beta version, move only `beta`, and mark the old GitHub prerelease withdrawn.

## Credentials and follow-up

Bootstrap uses a short-lived granular token in a required-reviewer environment.
Delete it immediately after all four package names exist, remove the one-time
bootstrap workflow in a follow-up commit, and configure exact-workflow,
stage-only npm OIDC trusted publishers. npm's trusted short-lived token is
restricted to publish/stage-publish operations, so stage inspection and 2FA
approval remain explicit maintainer actions.

Third-party Actions stay pinned to immutable commit SHAs. Standalone archives
remain blocked until each target has matching-environment certification and
required platform signing.

Every staging, attestation, bootstrap, and publication job refuses to run unless
`github.repository` is exactly `adrouter/adrouterCLI`.
