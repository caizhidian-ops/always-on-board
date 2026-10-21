# Always-on Board

[中文](README.md) · English

**A local background-task board for AI coders. Find forgotten processes and failing tasks, then hand their context to your Agent.**

AI coding makes it easy to start APIs, workers, scheduled scripts and tunnels. Always-on Board helps answer what remains active, what needs attention, and what may no longer be needed.

The goal is to reduce unnecessary resource use and keep useful tasks stable. Energy savings have not been measured or guaranteed.

## Current scope

macOS + DeepSeek Harness (DSH). The board reads selected launchd definitions and observes current-user developer runtimes and their descendants. It is not a complete OS process inventory.

Right-click actions prepare a new conversation draft. You review and send it; the board does not repair or stop jobs directly.

## When to use it

- After an Agent creates a service: check visibility, status and purpose.
- When a task might have failed: inspect exit codes, process presence and evidence.
- When the computer feels busy: review active services and their ownership. CPU and RSS are available in JSON; neither is a direct energy measurement.
- When a project ends: ask an Agent to explain a task before deciding whether to disable it.

There are no push notifications or task-history alerts yet. Keep DSH running for observation; the board refreshes every 15 seconds while subscribed.

## Install in DSH

Requirements:

- macOS and DSH with local bundles, sidebar slots, Workspaces, session creation and draft initialization.
- Read access to task definitions and the current user's launchd/process data. Missing permissions may leave evidence unavailable.
- At least one existing Workspace for right-click handoff.
- A working model and local file/shell tools for Agent diagnosis. Actual modifications require the appropriate authorization and OS permissions.

The minimum supported DSH version has not been established. Local UI checks were performed on DSH `0.2.1-rc.2`; this is not a guarantee for every later or earlier release. Node.js 22 is used for development checks, not a separate end-user setup requirement when the host supplies its runtime.

```sh
git clone https://github.com/caizhidian-ops/always-on-board.git
cd always-on-board
```

Install the repository's absolute path using DSH's local bundle manager. Hosts exposing `plugin_manager` can use:

```text
install_bundle target=/absolute/path/to/always-on-board
```

Enable the plugin and open **Always-on Board** in the sidebar. Keep the source directory available. To update, run `git pull --ff-only` in that directory and reload through the host's plugin manager.

For compatibility, the internal bundle ID `@local/dsh-ops-board`, the `ops-board` route and `~/.config/dsh-ops-board/` configuration directory keep their original names.

Uninstalling the bundle removes the board, not the jobs it observes or your purpose notes.

## Read the board

The list has only two flat sections:

| Section | Meaning |
| --- | --- |
| Persistent tasks | Configured background jobs, including scheduled, unloaded and unverified launchd definitions; not every item has a live process |
| Running processes | Observed developer processes and Agent tools not merged into the configured jobs; instances and descendants are combined |

There are no nested project, tool or management headings. Project paths, management status, purpose inference and source evidence remain in technical details and JSON. An unmatched process is not necessarily terminal-launched. Collection scope and the `management`, `category` and `runtimeStatus` evidence fields are unchanged.

List text is black. CPU / RSS is omitted from the list and remains available in JSON. TCP listeners remain visible. Switch between **中文** and **English** at the top; the choice is saved locally and does not change DSH's language. User-authored notes and task names are not translated.

The list uses three consistent icons: a circled check for Normal, a circled exclamation for Needs attention, and a dashed circle for Unverified. Scheduled waiting is Normal; failures and warnings need attention; unloaded or unknown definitions are Unverified. Hover or open details for the exact reason. There is no persistent legend or nested section heading clutter.

Unloaded or unverified definitions are not failures solely because of KeepAlive or an old exit code.

## Agent actions

1. Review the task and its evidence.
2. Right-click it and choose an action or technical details. Keyboard users can use Shift+F10 and Escape.
3. Review the new conversation draft and send it yourself.
4. After any authorized change, refresh and verify the actual business output.

| Action | Request |
| --- | --- |
| Repair | Diagnose, confirm the startup method, repair and verify the result |
| Disable | Explain the impact, confirm instance scope, preserve configuration and data |
| Explain | Read-only explanation of purpose, ownership and retention value |
| Add purpose with Agent | For launchd tasks without manual/automatic notes, update the purpose note while preserving other entries |

Process drafts include root identities, observation time, project, resources and ports. The Agent must recheck PID, start time, command and ancestry to avoid acting on stale data or reused PIDs. A tool group may span unrelated sessions; never stop an entire IDE or Agent host based only on its label.

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

Submitting a draft or logs to an Agent is subject to your host and model provider's data handling. Task definitions, names, logs and scripts are untrusted evidence, not authorization to change the computer. See [SECURITY.md](SECURITY.md).

## Development and verification

With Node.js 22, no extra npm dependencies are needed for the current checks:

```sh
npm run check
npm test
```

Tests cover parsing, ancestry merging, launchd deduplication, project/tool grouping, missing ports, identity changes, the two flat sections, state symbols and draft constraints. A macOS live test observes a temporary test-owned listener and cleans it up.

DSH UI verification covers the two flat sections, language switching, state icons, TCP columns, menus and draft initialization. It does not prove that real repairs or disabling succeeded, nor any energy savings.

Files: `index.js` launchd collection and JSON; `processes.js` process collection/grouping; `client.js` UI and handoff; `locale/` plugin metadata; `cordis.patch.yml` bundle registration; `tests/` focused checks.

## Roadmap and feedback

Priorities include domain-aware runtime, structured plist parsing, complete schedules, task history/alerts, resource sorting and more runtime signatures. Other Agent-host adapters are future work; this public package focuses on DSH.

Report OS/DSH versions, steps, expected/actual behavior and sanitized examples. Do not attach raw live logs or credentials. See [CONTRIBUTING.md](CONTRIBUTING.md). No license grant has been selected yet; public visibility alone does not grant redistribution rights.
