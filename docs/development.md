# Maintainer development

Use Node.js 22.19 or newer and install without lifecycle scripts:

```sh
npm ci --ignore-scripts
npm run build
npm run check
./test.sh
```

`npm run check` is read-only. Use `npm run format` explicitly to apply formatting. Development and tests must not use a maintainer's real home or AdRouter state. Package and smoke-test from a clean checkout outside the workspace.

## Source-linked CLI install

Build every workspace and expose the local CLI package through npm's global
link:

```sh
npm run install:local
adrouter --version
adrouter --help
adrouter-profile --help
```

The link points at the current checkout, but generated JavaScript does not
rebuild automatically. Run `npm run build` after source changes.

Remove the source link with:

```sh
npm unlink --global @adrouter/cli
```

To return to the public beta after unlinking:

```sh
npm install --global --ignore-scripts @adrouter/cli@beta
```
