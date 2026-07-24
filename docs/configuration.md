# Configuration

Precedence is command-line flags, environment variables, project `.adrouter/` settings, profile/global settings under `~/.adrouter/agent`, then built-in defaults.

The hosted beta defaults to `https://api-staging.adrouter.co`. A custom or local router can be selected with `ADROUTER_API_URL`; custom routers are operator-managed and are not covered by the hosted privacy commitment.

Supported AdRouter variables include:

- `ADROUTER_API_URL`
- `ADROUTER_API_KEY`
- `ADROUTER_AD_MODE=live|mock|off`
- `ADROUTER_CODING_AGENT_DIR`
- `ADROUTER_WORKSPACE`
- `ADROUTER_MODEL_ROUTE`
- `ADROUTER_RUNTIME_MODE=live|mock|auto`
- `ADROUTER_ALLOW_BROWSER_COOKIES`

Prefer `/login adrouter` over shell history or checked-in environment files. Never commit keys, paste them into bug reports, put them in command arguments visible to other users, or expose them through browser-prefixed environment variables. Use a unique, revocable, low-quota key per tester.
