# Upstream update workflow

AdRouterCLI locks every reviewed upstream source in `upstreams.lock.json`. Runtime bundles are
checked into the repository and packaged with the CLI; the CLI never downloads extension code at
startup.

## Audit

Run `npm run upstream:audit` for a read-only registry comparison. A newer reported version is an
advisory, not an instruction to change the frozen target or a CI failure. Update the lock only after
reviewing release notes, source, license, dependency changes, and the component's
adopt/adapt/defer/reject ledger.

## Stage

From a clean tree, run:

```sh
npm run upstream:stage -- --component <component-id> --version <exact-locked-version>
```

The command downloads into a mode-0700 temporary directory, verifies the locked SHA-256 and npm
integrity where applicable, extracts the source, prints its location, and leaves the repository
unchanged. Apply reviewed changes with ordinary source edits. Never point staging at `latest`.

## Regenerate and verify

After changing an active source or runtime contract, run `npm run upstream:generate`, review every
generated diff, and run `npm run upstream:check`. The generated documentation inventory and the
packaged `BUNDLED_SOURCES.json` must remain byte-identical. The generated TypeScript contract is the
only runtime source of versioned bundle directories, entrypoints, required commands/tools/handlers,
and bundled skills.

Keep Pi core, cache optimizer, and subagents in separate reviewable commits. Complete focused tests
for one component before stacking the next, then run the full `npm run check` and production-faithful
`npm run install:local` gates. Publication and channel movement remain separate authorized actions.
