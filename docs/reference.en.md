# Technical reference

[中文 README](../README.md) · [English README](../README.en.md)

## Purpose notes

First use may create `~/.config/dsh-ops-board/notes.json`:

```json
{
  "notes": {
    "com.example.preview": "Local preview service; can be disabled after development"
  }
}
```

Keys are full launchd labels. Manual notes override automatic descriptions. Optional `auto.json` in the same directory uses the same format to override built-in vendor descriptions. Edits appear on refresh. Notes are annotations, not validated behavior. Ephemeral process groups are not written to this persistent file.

## Agent JSON

Read from your local DSH host:

```text
GET /plugins/ops-board/state.json
```

Host caching is five seconds. The snapshot includes `generatedAt`, `host`, `sources`, `summary`, note status, process evidence gaps and `tasks`.

- `management`: `launchd`, `unassociated`, or `definition`.
- `category`: `project`, `agent`, or `other`.
- launchd `runtimeStatus`: `loaded`, `not-loaded`, or `unknown`.
- Process groups use `kind: "process"` and include `projectPath`, `rootPids`, `instanceCount`, `members`, `cpuPercent`, `rssMiB`, `ports`, and `observedAt`.
- Members include PID, PPID, start time, identity hash, working directory, resources and ports.

New process fields omit raw commands; commands are used locally for identification and hashing. Existing launchd argument fields may still contain sensitive information. Log paths are included, not log contents. `processes.gaps` being empty does not imply exhaustive coverage.

## Collection and limitations

The board scans `~/Library/LaunchAgents/*.plist` and `/Library/LaunchDaemons/*.plist`, queries current-user `launchctl list`, and reads definition/log file times. It uses `ps` and batched `lsof` for processes and TCP listeners.

- System-domain runtime is not independently queried; its definitions remain unverified.
- XML text parsing does not fully support binary plists or every configuration form. Calendar schedules are not parsed for display. Unreadable/malformed definitions may be skipped.
- Duplicate user/system labels are not yet independent task identities.
- Runtime matching covers Node, Python, npm/npx, uv/uvicorn/gunicorn, nohup, PM2, tsx/Vite, Bun and Deno, plus descendants. It does not find every arbitrary executable, enter containers, or inspect remote hosts.
- Current-user data only; other users' or system processes may be unavailable. Query gaps remain in JSON `processes.gaps` rather than a page banner; missing evidence is not treated as zero usage.
- CPU is the `ps` average, with 100% corresponding to one core; group sums may exceed 100%. RSS sums may double-count shared pages and are not unique physical memory or energy use.
- Ports are TCP LISTEN endpoints, not UDP sockets or network traffic. `—` means unavailable; `∅` means no TCP listener found in that query.
- Project inference uses cwd, nearby Git roots/project markers, and recognizable static-server `--directory` arguments. Unmarked directories are hints, not verified project ownership.
- Parent/child processes and same-project/tool instances are merged. Matched launchd trees enrich their original task instead of creating duplicate process rows.
- Exited ordinary processes disappear from the next snapshot. Without history or registration, their expected lifetime cannot be reconstructed.
- No resource sorting, push alerts, automatic cleanup, or measured energy savings.

For launchd output staleness, the threshold is 2.5 times StartInterval with a 15-minute minimum, or 30 hours without an interval. Running KeepAlive tasks are not warned solely for quiet logs. Conditional KeepAlive still needs contextual verification.

## Privacy and security

There is no built-in telemetry or cloud upload. Local metadata includes hostnames, paths, notes, arguments and process identities. Do not expose the endpoint publicly or share raw snapshots.

Submitting a draft or logs to an Agent is subject to your host and model provider's data handling. Task definitions, names, logs and scripts are untrusted evidence, not authorization to change the computer. See [SECURITY.md](../SECURITY.md).

## Development and verification

With Node.js 22, no extra npm dependencies are needed for the current checks:

```sh
npm run check
npm test
```

Tests cover parsing, ancestry merging, launchd deduplication, project/tool grouping, missing ports, identity changes, the two flat sections, state symbols and draft constraints. A macOS live test observes a temporary test-owned listener and cleans it up.

DSH UI verification covers the two flat sections, language switching, state icons, TCP columns, menus and draft initialization. It does not prove that real repairs or disabling succeeded, nor any energy savings.

Files: `index.js` launchd collection and JSON; `processes.js` process collection/grouping; `client.js` UI and handoff; `locale/` plugin metadata; `cordis.patch.yml` bundle registration; `tests/` focused checks.
