# Required repository settings

Apply a `main` ruleset requiring pull requests, one approval, resolved conversations, and all six
platform checks: `linux-x64`, `linux-arm64`, `windows-x64`, `windows-arm64`,
`darwin-x64`, and `darwin-arm64`. Disable force pushes and deletion.

Apply an immutable `v*-beta.*` tag ruleset. Restrict tag creation to release
maintainers and block force updates and deletion.

Enable secret scanning with push protection, dependency graph, Dependabot alerts and security updates, CodeQL default setup, and private vulnerability reporting.

Create these protected environments:

- `adrouter-staging`: an optional secret-free reviewer gate for tagged artifact staging.
- `npm-publish`: a required reviewer other than the workflow initiator for
  registry verification and final GitHub promotion.

No AdRouter profile or inference credential belongs in Actions. Exact-candidate
authentication is approved and exercised manually on operator-controlled devices,
then recorded in the validated public-safe acceptance asset. Configure an npm trusted publisher only for `@adrouter/cli`, bound to
`adrouter/adrouterCLI`, the provenance-enabled publication workflow used by
later releases, and the `npm-publish` environment.
