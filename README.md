# pi-session-identity

A small, zero-runtime-dependency extension for the [Pi coding agent](https://github.com/earendil-works/pi). It exposes the active session's exact storage paths through environment variables inherited by child processes.

| Variable | Value |
| --- | --- |
| `PI_SESSION_FILE` | Exact value returned by Pi's `sessionManager.getSessionFile()`: the current session JSONL file. |
| `PI_SESSION_DIR` | Exact value returned by Pi's `sessionManager.getSessionDir()`: the directory containing Pi session data. |

The values are refreshed on every `session_start` and removed on `session_shutdown`. If Pi reports no session file, as in an ephemeral session, the extension clears values it previously published and publishes no new ones. Cleanup is ownership-safe: it removes a variable only when its value still matches the value the extension wrote, so a pre-existing value or a later change by Pi or another extension is preserved.

Pi's built-in bash tool already exposes `PI_SESSION_FILE` in current releases. This extension also exposes `PI_SESSION_DIR` and makes both values available through the process environment for custom tools and other child-process launchers.

## Install

Pin the installation to an immutable commit:

```bash
pi install git:github.com/robobryce/pi-session-identity@COMMIT
```

Replace `COMMIT` with a full commit SHA from this repository. Pi loads `src/index.ts` through the package's `pi.extensions` metadata.

## Use

Child commands can read the paths normally:

```bash
printf 'session file: %s\nsession directory: %s\n' "$PI_SESSION_FILE" "$PI_SESSION_DIR"
```

The JSONL file contains session conversation and tool records. This extension never reads, copies, or transmits it; it only publishes the paths. Child commands with access to the environment may read the file, so install the extension only where that access is intended.

## Development

Requires Node.js 22.19 or newer.

```bash
npm ci
npm run check
```

`npm run check` runs linting, strict TypeScript checking, lifecycle tests, a package-content dry run, and a production dependency audit. The package is distributed from Git rather than npm; keep `package.json`'s version in sync with any release tag, run the full check before tagging, and keep installation examples pinned to immutable commits.
