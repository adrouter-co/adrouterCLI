# First run and usage

Start `adrouter` in the intended project. The first-project prompt controls whether repository-owned `.adrouter/` resources can load. Trust only reviewed workspaces.

Run `/login adrouter` and paste the beta key issued at `app-staging.adrouter.co`. Then select `deepseek-v4-flash` or `deepseek-v4-pro`. For non-interactive work:

```sh
adrouter --provider adrouter --model deepseek-v4-flash --print "Explain this project"
```

Use `/ads` to view sponsorship status or opt out immediately. Sponsor payloads are display-only. Commands proposed by the agent remain subject to user approval.

`adrouter-profile` creates and selects isolated profiles. Sessions, credentials, trust decisions, extensions, and settings live under `~/.adrouter/agent`; project resources live under `.adrouter/`.

Bundled features include web access, subagents, cache optimization, the OpenCode bridge, and the BTW side panel. To diagnose startup or extension behavior, disable bundled features individually in settings or start with project resources untrusted. Re-enable them one at a time after the fault is isolated.
