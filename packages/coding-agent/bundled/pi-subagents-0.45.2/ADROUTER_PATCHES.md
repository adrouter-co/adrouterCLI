# AdRouter 0.45.2 safe-subset ledger

This bundle is derived from `pi-subagents` 0.45.2 at commit
`7836c0f5ef642a00ae0572c910dec7a56216c74d`. Exact source and integrity values are frozen in
`upstreams.lock.json`. AdRouter carries forward its previously reviewed execution engine and ports
only the bounded 0.45.2 lifecycle behavior needed by the product.

Included runtime behavior:

- structured single, static parallel, and compatible chain execution;
- foreground/background status, interrupt, resume, and stop controls;
- bounded concurrency, output truncation, session-local run identity, cleanup, and doctor output;
- `adrouter` child-process re-entry with bundled product extensions disabled in children;
- user/project agent discovery under `.adrouter` and `~/.adrouter` only.

AdRouter policy constraints:

- maximum three children and concurrency three in every parallel group;
- at most one mutation-capable child per parallel group; other profiles explicitly use only
  `read`, `grep`, `find`, and `ls`;
- ambient credentials, provider and sponsor controls, Node preload hooks, MCP tools, normal
  extension discovery, and agent-supplied executable extensions are not copied into children;
- stop requests use a private bounded file and parallel cancellation retains an interrupt handle
  for every live child.

Explicitly disabled or omitted:

- missions, schedules, workflow JavaScript, profiles, watchdog automation, Herdr integration, and
  fleet product surfaces;
- managed worktrees, Gist sharing, provider catalog mutation, native/external intercom, and nested
  delegation;
- arbitrary cache/provider hints or access to personal Pi state.
- create/update/delete management, append-step, dynamic fanout, and executable acceptance commands.

The extension is kill-switchable with `ADROUTER_SUBAGENTS=off`. The disabled runtime still
registers stable command/tool contracts so startup diagnostics remain deterministic, but every
execution or management request returns a local disabled error without starting watchers or child
processes.
