# AdRouterCLI coding agent

This package provides the `adrouter` and `adrouter-profile` executables. AdRouterCLI is derived from [Pi](https://github.com/badlogic/pi-mono) by Mario Zechner and preserves Pi's original MIT license and copyright.

The public `0.81.0-beta.1` source and npm packages are MIT licensed. Access to the hosted gateway remains invite-only.

```sh
npm install --global --ignore-scripts @adrouter/cli@beta
adrouter
```

At first launch, review the workspace trust prompt, run `/login adrouter`, and paste the individual key issued at `app-staging.adrouter.co`. The hosted beta supports `deepseek-v4-flash` and `deepseek-v4-pro`. Run `/ads` to inspect or immediately disable display-only sponsorship.

Global state is stored under `~/.adrouter/agent`; project configuration is stored under `.adrouter/`. AdRouterCLI preserves user-approved command execution.

Full installation, usage, configuration, privacy, security, troubleshooting, and release documentation is maintained in the [public repository](https://github.com/adrouter/adrouterCLI#readme).

## Detailed reference

- [Usage](usage.md)
- [Providers](providers.md)
- [Settings](settings.md)
- [Sessions](sessions.md)
- [Security](security.md)
- [Extensions](extensions.md)
- [Skills](skills.md)
- [SDK](sdk.md)
- [RPC](rpc.md)
- [JSON mode](json.md)
- [Windows](windows.md)
- [Terminal setup](terminal-setup.md)

See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) and [BUNDLED_SOURCES.json](../BUNDLED_SOURCES.json) for bundled-source provenance.
