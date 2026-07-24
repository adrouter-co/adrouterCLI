# Release and recovery procedure

All four packages use one beta version and publish in this order:
`@adrouter/ai`, `@adrouter/tui`, `@adrouter/agent-core`, then
`@adrouter/cli`. The CLI is always last so no installable command is exposed
before its exact dependencies exist. A prerelease uses only the `beta` dist-tag;
it must never move `latest`.

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
to it under `latest`, and registry integrity matches the recorded artifact.

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
