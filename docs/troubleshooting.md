# Troubleshooting

Run `adrouter --json doctor` first. It reports configuration and reachability without printing the credential.

- Authentication: repeat `/login adrouter`; confirm the key is active, unexpired, unre­voked, and assigned to the correct staging account.
- Quota or budget: stop retrying and ask the beta operator to inspect the tester's spend cap.
- Network: verify DNS, TLS interception, proxy settings, and access to `api-staging.adrouter.co`.
- Terminal: reproduce in a current terminal with `TERM` set correctly; include dimensions and OS, not terminal history.
- Extensions: disable project resources, then bundled or user extensions one at a time.
- Model selection: use only `deepseek-v4-flash` or `deepseek-v4-pro` for the hosted beta.

For a bug report, include version, OS/architecture, Node version, exact safe reproduction steps, expected and actual behavior, and redacted diagnostics. Never attach credentials, raw sessions, prompts, model output, tool payloads, or personal paths.
