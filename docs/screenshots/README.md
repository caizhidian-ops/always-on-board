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

## Real screenshot excerpt / 真实截图节选

Added 2026-10-21: `05-real-public-tasks.png` (2674 × 912) is derived from a user-provided real screenshot. It is separate from the four synthetic-data tour images above.

At the user's request, sensitive rows were removed completely and the remaining row strips joined in their original order. The original title, controls and table header are retained. The sidebar, personal mascot, full-list counts and section total are omitted. No replacement task names, descriptions, status icons or other task data were generated or painted over.

The 8 retained rows are Docker socket, Docker vmnetd, Chrome Keystone agent, Chrome Keystone XPC service, Office licensing, Java updater, Razer uninstaller watcher and Chrome updater. Visual review confirmed that no private project name, VPN/proxy entry, chat history, personal path, hostname, email, credential or local service endpoint remains. The image is an edited list excerpt, not the full original board or evidence of current service health.

`crop-public-rows.cjs` records the deterministic crop coordinates and validates the original dimensions. It requires Sharp from an external tool environment and takes the private input path as an argument. The raw screenshot and the earlier masked preview remain outside Git; only this reviewed derivative is published. The captions in both READMEs disclose the cropping and row removal. No task or process was modified.
