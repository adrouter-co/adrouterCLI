# Maintainer development

Use Node.js 22.19 or newer and install without lifecycle scripts:

```sh
npm ci --ignore-scripts
npm run build
npm run check
./test.sh
```

`npm run check` is read-only. Use `npm run format` explicitly to apply formatting. Development and tests must not use a maintainer's real home or AdRouter state. Package and smoke-test from a clean checkout outside the workspace.
