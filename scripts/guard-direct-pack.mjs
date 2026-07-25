#!/usr/bin/env node

throw new Error(
	"Direct @adrouter/cli packing/publishing is unsupported because it omits private workspace dependencies. " +
		"Use the repository release builder (npm run publish:dry or node scripts/npm-artifact.mjs callers).",
);
