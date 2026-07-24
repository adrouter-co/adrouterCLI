# Required repository settings

Apply a `main` ruleset requiring pull requests, one approval, resolved conversations, and all six
platform checks: `linux-x64`, `linux-arm64`, `windows-x64`, `windows-arm64`,
`darwin-x64`, and `darwin-arm64`. Disable force pushes and deletion.

Apply an immutable `v*-beta.*` tag ruleset. Restrict tag creation to release
maintainers and block force updates and deletion.

Enable secret scanning with push protection, dependency graph, Dependabot alerts and security updates, CodeQL default setup, and private vulnerability reporting.

Create these protected environments:

- `adrouter-staging`: a required reviewer and `ADROUTER_STAGING_API_KEY`.
- `npm-bootstrap`: a required reviewer other than the workflow initiator and a
  short-lived `NPM_BOOTSTRAP_TOKEN`.
- `npm-publish`: a required reviewer other than the workflow initiator for OIDC
  staging and final GitHub promotion.

Use a unique, low-quota, revocable staging canary key. After bootstrap, configure
stage-only npm trusted publishers for all four packages against
`adrouter/adrouterCLI`, `.github/workflows/promote-release.yml`, and the
`npm-publish` environment.
