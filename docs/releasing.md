# Release and recovery procedure

Only `@adrouter/cli` is public. `@adrouter/ai`, `@adrouter/tui`, and
`@adrouter/agent-core` remain exact-version dependencies and distinct runtime
packages, but they are private workspaces embedded in the CLI tarball through
`bundleDependencies`. Never publish an internal workspace.

## Beta.3 recovery

`0.81.0-beta.3` supersedes the deprecated beta.2 release, whose registry-style
installation exposed a bundled dependency-tree conflict. Neither beta.1 nor
beta.2 is reused or overwritten.
This recovery publication is direct and user-authenticated without provenance
because the package does not yet have a trusted publisher. Move both `beta` and
`latest` from deprecated beta.2 to beta.3. Testers remain instructed to install
`@beta`.

Before tagging:

1. Run `npm run build`, `npm run check`, `npm run test:isolated`,
   `npm run check:beta-readiness`, and `node scripts/ci-package-smoke.mjs`.
2. Require the existing Linux, macOS, and Windows arm64/x64 CI matrix to pass
   against the single bundled tarball.
3. Confirm the intended version does not exist on npm and that no current
   release metadata refers to beta.1.

## Tag, canaries, and draft prerelease

Create immutable tag `v0.81.0-beta.3` only after the release commit and
six-platform CI are green. The tag workflow validates the exact tagged source,
runs protected ads-off and ads-enabled staging canaries without printing the
beta credential, builds the single npm tarball, records its SHA-512 integrity,
creates the CycloneDX SBOM and checksums, attests the tarball and release
metadata, and creates an exact-inventory draft GitHub prerelease.

Do not publish npm or make the GitHub prerelease public if a canary, checksum,
attestation, or draft-inventory check fails.

## Clean-tag rebuild and authentication pause

From a new temporary checkout of the exact tag:

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm run test:isolated
npm run check:beta-readiness
node scripts/publish.mjs --dry-run --out /absolute/clean/output --manifest /absolute/clean/npm-artifacts.json
node scripts/ci-package-smoke.mjs
```

Record `npm-artifacts.json` and the tarball without modifying either. Confirm
the clean rebuild has the expected version, bundled tree, size, and SHA-512
integrity. Pause here for the maintainer's npm authentication and any OTP or
account verification. Credentials must not be committed, echoed, or retained.

Verify the authenticated session, public registry, scope permission, and
version absence:

```sh
npm whoami --registry https://registry.npmjs.org/
npm access list packages @adrouter --registry https://registry.npmjs.org/
npm view @adrouter/cli@0.81.0-beta.3 --registry https://registry.npmjs.org/
```

The final command must return not found. If it resolves, stop: npm
name/version combinations are immutable.

## Publish the recorded tarball

Publish only the already-recorded file:

```sh
npm publish /absolute/clean/output/adrouter-cli-0.81.0-beta.3.tgz \
  --access public \
  --tag beta \
  --ignore-scripts \
  --provenance=false \
  --registry https://registry.npmjs.org/
```

`node scripts/publish.mjs --publish --tarball <file> --manifest <file>` performs
the same direct command after verifying the checkout, version absence,
permission preflight, artifact filename, and recorded integrity. It must be run
only during the authenticated publication step.

## Registry verification and GitHub promotion

Poll the public registry until beta.3 resolves. Rebuild
`npm-artifacts.json` from the protected tag and run:

```sh
node scripts/verify-npm-release.mjs
node scripts/verify-registry-install.mjs
```

Verification requires both `beta` and `latest` to resolve to beta.3,
registry integrity and metadata to match the recorded artifact, anonymous
global installation in a clean prefix, both executables and their diagnostics,
all embedded internal package roots and runtime assets, and a clean
`npm ls --global --all`.

Run the promotion workflow's `verify-npm` phase, then its `publish-github`
phase. The latter runs anonymous registry-install verification on all six
platforms and publishes the draft GitHub prerelease only after every platform
succeeds. Log out and revoke the temporary npm credential after verification.

## Later releases and recovery

Configure an npm trusted publisher for `@adrouter/cli` after the bootstrap so
later releases use OIDC provenance. Exact repository/workflow binding and
required-reviewer protections remain mandatory.

If beta.3 is defective, preserve and deprecate it, publish beta.4, and move both
`beta` and `latest` to beta.4. Never overwrite or reuse a published version.
Backend incidents remain independently containable by pausing traffic and
revoking beta keys.

Third-party Actions stay pinned to immutable commit SHAs. Standalone native
archives remain blocked until each target has matching-environment
certification and required platform signing. Every canary, attestation,
verification, and publication workflow refuses to run outside
`adrouter/adrouterCLI`.
