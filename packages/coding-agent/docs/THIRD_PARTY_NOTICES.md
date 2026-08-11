# Third-party notices

AdRouterCLI distributes source copies of the following optional extensions in
`bundled/`. They are enabled for normal AdRouterCLI startup unless
`ADROUTER_BUNDLED_FEATURES=off` is set.

| Component | Version | Source | License |
| --- | --- | --- | --- |
| pi-subagents | 0.45.2 (reviewed AdRouter subset) | https://registry.npmjs.org/pi-subagents/-/pi-subagents-0.45.2.tgz | MIT |
| pi-cache-optimizer | 2.8.2 (reviewed AdRouter subset) | https://registry.npmjs.org/pi-cache-optimizer/-/pi-cache-optimizer-2.8.2.tgz | MIT |
| pi-web-access | 0.13.0 | https://registry.npmjs.org/pi-web-access/-/pi-web-access-0.13.0.tgz | MIT |
| BTW | `23017e9` | project-owner source: `~/antigravity/pi-stuff/btw` | Project-owner source; distribution authorized |
| pi-opencode-tui-patch | 0.1.6 (`e687e69b`) | project-owner source: `~/antigravity/pi-stuff/pi-opencode-tui-patch` | Project-owner source; distribution authorized |

`pi-subagents@0.45.2` is pinned with npm integrity
`sha512-VEvBF6vrpi+eLEjhgwqutSnaH/aw58+Um9vdJUc6Td1asH22bAKahrgD3AafaRNsROgiaukw4DRdmlRjEhBxQA==`.
AdRouter retains its reviewed bounded execution engine and ports only the declared 0.45.2 lifecycle
subset. The public schema and runtime policy remove upstream automation and authority-expanding
surfaces; exact adaptations are listed in the bundle's `ADROUTER_PATCHES.md`.

`pi-cache-optimizer@2.8.2` is pinned with npm integrity
`sha512-z5Ff2ZUF+U4O3gpV/uKTvO5046Zx/km1nDAw22b1GUKb8yslDAo1EZMlxTFTex9XGsmg/MVEt3FRmmpNNlpWvQ==`.
Only truthful normalized-usage statistics and an opt-in, DeepSeek-only stable-prefix rewrite are
retained; provider/model mutation and raw cache controls are omitted.

`pi-web-access@0.13.0` is pinned with npm integrity
`sha512-ny0bHisMWdobmu1hcMp/jqjaRh6pYrH7dctBK2CVyRF4ia7bP47RnOPYdG1yiks9ohtcanWir5Hl9EFap8h0zQ==`.
Its runtime source, manifest, librarian skill, and license are retained; demo
media and upstream tests are omitted. Its runtime JavaScript dependencies are
compiled into `bundled/pi-web-access-0.13.0/dist/index.js`, while host extension
API imports remain external for loader compatibility.

## Project-owner sources

BTW commit `23017e9d` and pi-opencode-tui-patch commit `e687e69b` were created
by the AdRouterCLI project owner. The project owner authorized their inclusion,
modification, and redistribution in AdRouterCLI npm and standalone packages.
The patch source is integrated into AdRouterCLI rather than loaded at runtime.
Authorization details are recorded in `BUNDLED_SOURCES.json`.

The original package manifests and any distributed license files remain in the
corresponding bundle directory. Local changes are recorded in
`docs/bundled-sources.json`.
