# Screenshot generation / 截图生成与复核

2026-10-21 · Board source: `a4da10e57b40d234d6d44060abb34bc2e179e532` · DSH `0.2.1-rc.2` · Node 22 · Chrome via Playwright.

四张演示 PNG 均为 1440 × 1000、中文、浅色界面。两份 README 使用相对路径共用资源。

- `01-empty.png`: 当前 `client.js` 的空状态，注入空快照。没有停用或清空本机任务。
- `02-setup.png`: 浏览器渲染的文档说明卡；不是产品截图或虚构的 setup 向导。命令与 README 安装流程一致，`/Users/demo/Projects/demo/always-on-board` 为虚构绝对路径，实际使用须替换。
- `03-lists.png`: 当前 `client.js` 的真实列表，使用 3 个合成 launchd 定义和 2 个合成进程组。无 CPU/RSS 主列表列；保留三个线条状态图标与两个平铺列表。
- `04-explain-draft.png`: 同一次隔离演示中，真实右键菜单与点击“解释”后真实 DSH composer 的裁剪组合。自动检查草稿含 `com.example.preview`、示例配置路径及“只查看，不修改”。未点击发送、未调用模型。

These are synthetic-data illustrations, not proof of production health, real process collection, repair, disabling, or installation compatibility across DSH versions. Image 2 is a documentation card; image 4 combines two real UI captures without changing their content.

## Reproduce

Use Node 22, an installed DSH `0.2.1-rc.2`, Playwright and Chrome. No production credentials are needed. Use a **new disposable directory** for `DSH_HOME`; the preparation script rejects an existing directory without its demo marker. Runtime dependencies are supplied by the host, not added to this plugin.

From the repository root, with Node 22 on PATH:

```sh
node docs/screenshots/prepare-host.mjs /tmp/aob-docs-example
DSH_HOME=/tmp/aob-docs-example dsh web --no-open --host 127.0.0.1 --port 43871 > /tmp/aob-docs-example.log 2>&1
```

Leave that foreground host running. In another terminal:

```sh
AOB_HOST_LOG=/tmp/aob-docs-example.log node docs/screenshots/capture.cjs
```

`require('playwright')` must resolve from your environment (or set `NODE_PATH` to an existing external tool dependency directory). No dependency install or browser session from the personal DSH profile is used. The log contains a temporary local authentication URL: keep it outside Git. Close only this temporary host after capture.

`prepare-host.mjs` copies the unchanged client into a disposable bundle and substitutes a no-op host module. It **never imports the collector** and therefore does not read launchd, ps, lsof, task logs or purpose notes. The browser injects only the fixture in `capture.cjs`, uses a fresh profile and blocks non-loopback network requests. DSH sessions remain inside the disposable home; telemetry and model-generated session titles are disabled. No real Agent messages are sent. All framing is added after capture; production UI/logic is unchanged.

## Visual and privacy review

Each final PNG was opened and visually checked at full size:

| Image | Visual check | Privacy check |
| --- | --- | --- |
| 01 | Empty state, sidebar entry and zero counts are readable | Fresh default workspace; generic scan paths only |
| 02 | Installation order and full command fit; explicitly says “非产品向导” | Public repository URL and fictional demo user/path only |
| 03 | Two flat sections, all 5 rows, three status icons and TCP column visible | Only `com.example.*`, `demo-*`, loopback ports and synthetic counts |
| 04 | “解释” highlighted; full draft, task ID, configuration and send control visible | Synthetic task and `~/Library/LaunchAgents` only; no chat history or submitted message |

No private source screenshot, hostname, avatar, real business label, email, credential, personal absolute path or conversation history was captured into these assets. The generic DSH logo and default workspace are host UI. Final assets carry “隔离演示 / 示例数据”. Screenshots and generation inputs are reviewed together; do not replace fixtures with a real state endpoint response.

## Real data excerpt / 真实数据节选

Updated 2026-10-21: `05-real-public-tasks.png` (2640 × 1000) replaces the vendor-only crop. It shows three personal-project tasks (innote API, Gray Hole dashboard and ImportantKanban) and three running process groups (Remotion, Blender MCP and Code Review MCP).

This is **real collection data filtered before rendering**, not a pixel crop of the original screenshot or a synthetic fixture. `collect-public-excerpt.mjs` runs the current collector with its notes-writing call replaced by a read-only notes read. It selects exactly six allowlisted entries and exports only display fields to a temporary file outside Git. Purpose annotations for the three persistent tasks are transcribed from the user's original screenshot; they are annotations, not newly verified service behavior. Actual states, ports, update times and instance/process counts come from collection. Header counts refer only to the six selected rows.

`capture-public-excerpt.cjs` loads that display projection into the isolated no-op host described above, blocks external requests and captures only the board panel. No personal path, hostname, command arguments, identity hash, VPN/proxy entry, credentials or conversation history is published. The raw snapshot and original screenshot remain outside Git. No model messages or task actions are performed.

Reproduce after starting a new isolated host with `prepare-host.mjs`:

```sh
node docs/screenshots/collect-public-excerpt.mjs /tmp/aob-public-excerpt.json
AOB_HOST_LOG=/tmp/aob-docs-example.log node docs/screenshots/capture-public-excerpt.cjs /tmp/aob-public-excerpt.json
```

Node 22 and external Playwright/Chrome are required. Collection fails if an allowlisted entry is absent rather than inventing it. The final image was visually reviewed row by row: both flat sections, all six names/descriptions, status icons, counts and ports are readable. Browser checks verify six rows and reject unexpected private-path/network-tool text. The original four tour images remain synthetic demonstrations and are unchanged.
