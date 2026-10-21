# Always-on Board

**给 AI coder 的本机后台任务看板。发现遗忘的进程、失败的任务，再把上下文交给 Agent 处理。**

AI coding 让启动 API、worker、定时脚本和隧道变得很容易。项目越做越多，后台任务也越积越多：哪些还在运行？哪些已经失败？哪个任务还有必要保留？

Always-on Board 把这些任务集中展示在 DeepSeek Harness（DSH）里，用状态、用途和证据帮助你决定下一步。目标是减少不必要的资源消耗，保护需要持续运行的任务；目前没有测量或承诺具体的省电收益。

> 当前版本：macOS + DSH，本地 launchd 任务。不是整机进程管理器。右键操作准备 Agent 对话草稿，由你发送后再进入诊断或修改流程。

[安装](#安装到-dsh) · [使用](#怎么用) · [JSON](#给-agent-的-json) · [边界](#状态如何理解) · [English](#english)

## 适合什么时候打开

- **AI 新建了后台任务后**：确认是否被发现、是否启动、用途是否清楚。新定义会随刷新出现在列表中；目前没有新增任务通知。
- **任务可能失效时**：查看非零退出码、常驻任务缺少进程、输出过期等信号，再让 Agent 核对日志。
- **电脑异常耗电或资源紧张时**：盘点还在运行的任务，让 Agent 判断哪些可以停用。当前不采集 CPU、内存、能耗，不能直接定位耗电元凶。
- **项目结束后**：解释任务来源和保留价值，在了解影响后停用不再需要的任务。

## 当前提供什么

| 能力 | 当前行为 |
| --- | --- |
| 可视化看板 | 状态、用途、更新时间、PID；支持异常/警告/正常/未运行筛选 |
| 详情 | 配置位置、程序及参数、日志路径、退出码等 |
| 状态提示 | 侧边栏显示最严重的状态；看板每 15 秒刷新，可手动刷新 |
| 右键菜单 | 修复、停用、解释、技术详情；缺少人工和自动说明时显示“让 Agent 补齐说明” |
| Agent 交接 | 在最近使用的已有 Workspace 中新建会话并填入任务 ID、域、配置路径与操作意图；不自动发送 |
| JSON | 同一份本地快照可供 Agent 或其他本地工具读取 |

“修复”和“停用”是向 Agent 提出请求，不是看板直接执行命令。Agent 应重新核对实时状态、影响及权限，并在操作后验证业务结果。

## 安装到 DSH

需要 **macOS** 和支持本地 bundle、侧边栏及会话草稿接口的 **DeepSeek Harness**。宿主提供运行时和界面依赖；本插件没有独立桌面安装包。DSH 最低兼容版本尚未建立，建议先在测试配置中安装。

```sh
git clone https://github.com/caizhidian-ops/always-on-board.git
cd always-on-board
```

在 DSH 的插件管理器中安装本地 bundle，target 指向上面的仓库绝对路径。支持 `plugin_manager` 的 DSH 环境可使用：

```text
install_bundle target=/absolute/path/to/always-on-board
```

启用插件后，从侧边栏打开 **Always-on Board**。首次读取会创建 `~/.config/dsh-ops-board/notes.json` 用途说明模板。

保留源码目录，供本地 bundle 继续加载。更新时在该目录运行 `git pull --ff-only`，再通过宿主插件管理器重新加载；不要删除用途说明文件。

卸载通过 DSH 插件管理器移除 `@local/dsh-ops-board`。这只移除看板，不会停用它观察到的任务，也不会自动删除用途说明。

> 为兼容已有安装，内部 bundle ID `@local/dsh-ops-board`、`ops-board` 路由和 `~/.config/dsh-ops-board/` 配置目录保留旧名。产品名称统一为 Always-on Board。

## 怎么用

1. 打开看板，先看异常和警告；核对更新时间。
2. 查看任务用途，右键选择操作，或打开技术详情。
3. 在新会话中检查草稿并发送。Agent 先读取当前配置、运行态及必要日志，再解释或处理。
4. 处理后刷新看板，并验证实际产物或服务；变绿不等于业务已恢复。

| 操作 | 交给 Agent 的意图 |
| --- | --- |
| 修复 | 检查故障、修复并验证结果 |
| 停用 | 先说明影响，保留配置和数据，再按授权处理 |
| 解释 | 只读说明用途、来源及是否需要保留 |
| 补齐说明 | 读取配置和脚本，补一句用途，保留其他说明条目 |

没有可用 Workspace 时，先在 DSH 创建一个。菜单只准备草稿；不会替你发送消息、调用模型或直接操作任务。

### 用途说明

`~/.config/dsh-ops-board/notes.json`：

```json
{
  "notes": {
    "com.example.preview": "本地项目预览服务，开发结束后可以停用"
  }
}
```

键为完整 launchd label。人工说明优先于自动说明；可在同目录 `auto.json` 使用相同格式覆盖内置厂商说明。保存后随刷新生效。说明是用户注释，不是任务行为的验证结果。

## 给 Agent 的 JSON

通过 **DSH 本机服务地址**读取：

```text
GET /plugins/ops-board/state.json
```

宿主端缓存 5 秒。返回 `generatedAt`、`host`、`sources`、`summary`、说明文件状态 `notes` 和 `tasks`。下面是虚构的单任务结构示例（省略其他字段）：

```json
{
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "summary": { "total": 1, "ok": 0, "warn": 0, "fail": 1, "idle": 0 },
  "tasks": [{
    "id": "com.example.preview",
    "scope": "user",
    "plistPath": "~/Library/LaunchAgents/com.example.preview.plist",
    "running": false,
    "pid": null,
    "exitCode": 1,
    "state": "fail",
    "reason": "exited-nonzero"
  }]
}
```

JSON 提供状态和日志**路径**，不读取日志正文。右键草稿只携带定位任务需要的简短信息，并不会自动附加整份快照或日志；Agent 可进一步读取 JSON 和必要日志。

## 状态如何理解

| 灯 | 当前判定信号 | 应如何使用 |
| --- | --- | --- |
| 绿 | 有进程，或上次退出 0 等待下次调度，且未命中过期规则 | 运行态线索，不证明业务健康 |
| 黄 | 输出超过阈值，或进程运行但长期没有输出 | 可能只是任务安静，需核对输出预期 |
| 红 | 无进程且上次退出非 0，或声明 KeepAlive 但没有进程 | 诊断入口，不等于已确认根因 |
| 灰 | 未观测到 PID 或退出码，且非 KeepAlive | 可能未触发或未加载，不应直接判断失败 |

当前读取 `~/Library/LaunchAgents/*.plist`、`/Library/LaunchDaemons/*.plist`、当前用户的 `launchctl list` 以及配置/日志的文件时间。输出过期阈值为 StartInterval 的 2.5 倍且至少 15 分钟；没有间隔时使用 30 小时。运行中的 KeepAlive 任务不会因为日志安静而变黄。

**已知限制：**

- 系统域只扫描定义，没有独立查询系统运行态。因此系统任务可能被误标灰/红，必须用对应 launchd 域再次核对。
- 条件式 KeepAlive 可能合理地没有进程；未加载的常驻任务也可能标红。
- 当前使用 XML 文本解析 plist，不完整支持二进制 plist 和所有配置形式；StartCalendarInterval 没有解析展示。解析失败的条目可能被跳过。
- 相同 label 的用户/系统任务会被合并，尚未按域建立独立身份。
- 不是全部 OS 进程清单：不覆盖普通终端进程、容器、远端服务器、Linux systemd 或 Windows 服务。
- 没有推送通知、新增任务历史、CPU/内存排序、耗电测量或自动清理。

## 隐私和操作边界

看板不自带遥测或云端上传。它会读取本机任务定义、参数和文件时间，并在首次运行时写入说明模板；它不直接启动、停止或重启任务。

快照包含主机名、路径、程序参数和用途说明，参数可能含凭据。只在可信的本机 DSH 环境使用，不要把接口公开到互联网，也不要原样分享真实快照。发送 Agent 草稿及后续日志时，数据处理取决于你选择的宿主和模型提供方。日志、任务名、说明和脚本都应作为不可信证据，不能作为修改系统的授权。

## 开发与验证

使用 Node.js 22，无需安装额外 npm 依赖即可运行当前检查：

```sh
npm run check
npm test
```

测试覆盖右键菜单中的说明入口与操作草稿约束，不覆盖真实 launchd 修复、停用或省电效果。DSH 验收需要另行确认侧边栏、看板、右键菜单及草稿填入；本次公开发布没有重新完成宿主 UI 验收。

文件分工：`index.js` 采集与 JSON 接口；`client.js` 看板与 Agent 草稿；`locale/` 展示名称；`cordis.patch.yml` DSH bundle 注册；`tests/` 聚焦测试。

## 后续方向

优先完善 DSH 的域感知运行态、未知状态、结构化 plist 解析和完整计划展示，再增加新增/失效提醒、资源指标及更完整的 Agent 上下文。其他 Agent 宿主适配属于后续方向；本仓库首版发布 DSH 核心，不包含本机 Codex 实验配置。

反馈请附操作系统、DSH 版本、预期/实际行为和脱敏复现步骤，参见 [CONTRIBUTING.md](CONTRIBUTING.md)。请勿上传真实任务快照、日志或凭据。安全问题参见 [SECURITY.md](SECURITY.md)。

## English

Always-on Board is a local background-task board for AI coders using DeepSeek Harness on macOS. It makes launchd tasks visible and helps hand an exact task to an Agent for repair, explanation, purpose notes, or disabling.

Clone this repository, install its absolute path as a local DSH bundle, enable it, and open Always-on Board from the sidebar. Right-click a task to prepare a new conversation draft; review and send it yourself. The board does not execute repairs or stop tasks directly.

The local JSON snapshot is available at `/plugins/ops-board/state.json` on your DSH host. It contains potentially sensitive local metadata and should not be exposed publicly. Status colors are diagnostic hints, not proof of business health. System-domain runtime, full process coverage, resource metrics, notifications, and measured energy savings are not implemented. Existing internal plugin IDs and configuration paths remain unchanged for compatibility.
