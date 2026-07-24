# Installation

AdRouterCLI requires Node.js 22.19 or newer. On macOS and Linux, install Node with the official installer or a maintained version manager. On Windows, install Node for all users or ensure the per-user npm binary directory is on `PATH`.

```sh
npm install --global --ignore-scripts @adrouter/cli@beta
adrouter --version
adrouter --help
```

If the command is missing, inspect `npm prefix --global`. Add its executable directory to your shell `PATH`; on Windows this is commonly the npm prefix itself, while Unix installations commonly use its `bin` directory. Restart the terminal after changing `PATH`.

For a published native archive, download the archive, `SHA256SUMS`, and SBOM from the same prerelease. Confirm the asset is listed as eligible in `release-manifest.json`, then run `sha256sum -c SHA256SUMS` (or `shasum -a 256 -c SHA256SUMS` on macOS) and `gh attestation verify <asset> --repo adrouter/adrouterCLI`. Do not install an artifact marked blocked.

Upgrade with:

```sh
npm install --global --ignore-scripts @adrouter/cli@beta
```

Uninstall with:

```sh
npm uninstall --global @adrouter/cli
```

Uninstalling does not remove `~/.adrouter/agent`. Back it up before deleting it. Never use Gatekeeper or SmartScreen bypass instructions; a missing or invalid platform signature is a release defect.
