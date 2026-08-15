# Verification Record

Date: 2026-08-15 · Environment: Windows, Node 24.19.0 (bundled runtime), pnpm 11.19.0, dsh CLI 0.1.0-rc.6

## 1. TypeScript build

```sh
pnpm run build
```

Result: `tsc -p tsconfig.json` exits 0, emits `lib/` with `index.js`, `github.js`, and type declarations.

## 2. Unit tests

```sh
pnpm test
```

Result: 2 test files, 15 tests, all passed. Coverage includes GitHub API mapping/preview/rate-limit/404 behavior, tool registration, limit clamping, and empty-input rejection.

## 3. Package and install into a dsh profile

```sh
pnpm pack                                   # → dsh-github-release-radar-0.2.0.tgz
dsh plugin --profile web add ./dsh-github-release-radar-0.2.0.tgz
```

Result: package added to the `web` profile; `dsh --profile web --dump-config` shows the `dsh-github-release-radar` layer after `@deepseek-ai/dsh-base`.

## 4. Boot the web app with the plugin loaded

```sh
dsh web --port 4099
```

Result: `dsh web: http://127.0.0.1:4099`; `GET /` returns HTTP 200 (12,076 bytes). No plugin load errors. The plugin's tools are registered during `apply()`; a schema/registration failure would abort boot.

## Known ecosystem note

`@deepseek-ai/dsh-tools` on npm has both `0.0.1-rc.x` and `0.1.0-rc.x` releases; the `latest` dist-tag points at `0.0.1-rc.1`, whose peer `@deepseek-ai/dsh-user-approval@0.0.1-rc.1` depends on the unpublished `@deepseek-ai/dsh-type-meta` and cannot be installed standalone. This plugin targets `@deepseek-ai/dsh-tools ^0.1.0-rc.6`, matching the current `dsh` 0.1.0-rc.6 release train.

## Agent-visibility verification (2026-08-15)

`scripts/visibility-check.mjs` mounts a REAL Cordis context, the REAL `@deepseek-ai/dsh-tools` ToolRuntime, and a real scoped agent context, applies the plugin through the real registration path, and asserts all four tools are visible in `ctx.tools.schemas(scope)`. This closes the registry-level half of the dual-instance concern (discussions #1697/#1782); the remaining caveat is that a full interactive agent session is not exercised in CI.
