# Troubleshooting

Run `adrouter --json doctor` first. It reports configuration, reachability, pending enrollment, refresh health, and signed-request capability without printing private keys, access/refresh credentials, codes, nonces, proofs, or full fingerprints.

For deployments, `installation.deployable` must be `true`. If doctor reports
`source-linked`, `unknown`, or an unready bundled dependency, reinstall the
exact packaged version:

```sh
npm install --global --ignore-scripts @adrouter/cli@0.81.0-beta.6
```

Use `ADROUTER_BUNDLED_FEATURES=off` only as an explicit core-only recovery
mode; extension commands, tools, and skills are unavailable in that mode.

- Authentication: if diagnostics report pending enrollment, repeat `/login adrouter` to resume it before expiry. If they report an expired family, invalid local key, or `reenrollmentRequired`, run `/logout adrouter`, review remote installations in the WebUI, and enroll again. A lost private key cannot be recovered from the server.
- Quota or budget: stop retrying and ask the beta operator to inspect the tester's spend cap.
- Network: verify DNS, TLS interception, proxy settings, and access to `api-staging.adrouter.co`.
- Terminal: reproduce in a current terminal with `TERM` set correctly; include dimensions and OS, not terminal history.
- Extensions: disable project resources, then bundled or user extensions one at a time.
- Model selection: use only `deepseek-v4-flash` or `deepseek-v4-pro` for the hosted beta.

For a bug report, include version, OS/architecture, Node version, exact safe reproduction steps, expected and actual behavior, and redacted diagnostics. Never attach credentials, raw sessions, prompts, model output, tool payloads, or personal paths.
