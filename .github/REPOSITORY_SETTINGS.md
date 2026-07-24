# Required repository settings

Apply a `main` ruleset requiring pull requests, one approval, resolved conversations, and passing CI. Disable force pushes and deletion. Apply a protected `v*` tag ruleset that disables force updates and deletion.

Enable secret scanning with push protection, dependency graph, Dependabot alerts and security updates, CodeQL default setup, and private vulnerability reporting.

Create required-reviewer environments for `adrouter-staging`, `macos-signing`, `windows-signing`, `npm-bootstrap`, `npm-publish`, and `github-release`. Use a unique, low-quota, revocable staging canary key.
