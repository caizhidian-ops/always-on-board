# 技术参考

[中文 README](../README.md) · [English README](../README.en.md)

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

JSON 提供状态和日志**路径**，不读取日志正文。普通进程组使用 `kind: "process"`，包含 `category`、`projectPath`、`rootPids`、`instanceCount`、`members`、`cpuPercent`、`rssMiB`、`ports`、`observedAt`。每个成员包含 PID、父 PID、启动时间、身份摘要、工作目录和资源数据。完整命令行只用于本机识别和计算身份摘要，不进入新增进程 JSON；原有 launchd 参数字段仍可能包含敏感信息。

右键草稿要求 Agent 重新核对 PID、启动时间、命令和父子关系，防止过期快照及 PID 复用；多实例先确认操作范围，不应停止整个 IDE 或不相关会话。Agent 可进一步读取 JSON 和必要日志。

## 两类列表

| 分类 | 展示内容 |
| --- | --- |
| 常驻任务 | 已配置的后台任务，包含 launchd 常驻、定时、未加载和运行态待确认的配置；并不表示每项此刻都有进程 |
| 运行进程 | 当前观测到、未合并到上述任务的开发进程和 Agent 工具；同组实例和子进程合并显示 |

两区内直接列任务，不再插入项目路径、Agent 工具或管理方式的多级标题。项目路径、管理方式、用途归组和来源证据保留在技术详情与 JSON 中。未关联到已知管理器并不代表一定由终端启动。

JSON 继续保留 `management: launchd | unassociated | definition`、`category: project | agent | other` 和 launchd `runtimeStatus: loaded | not-loaded | unknown`，界面简化不改变采集范围或底层证据。

## 状态如何理解

列表使用三种统一图标：正常（圆圈勾选）、需处理（圆圈叹号）、待确认（虚线圆圈）。待调度归入正常，故障和警告归入需处理，未加载或运行态未知归入待确认。列表不展示图例和多级标题，悬停或打开详情查看具体原因。

未加载和未知配置不会仅因为 KeepAlive 或历史退出码直接标为故障。已加载的任务仍用退出码、进程和输出时间作为诊断线索。

当前读取 `~/Library/LaunchAgents/*.plist`、`/Library/LaunchDaemons/*.plist`、当前用户的 `launchctl list` 以及配置/日志的文件时间；通过 `ps` 和批量 `lsof` 补充当前用户的开发运行时及子进程。输出过期阈值为 StartInterval 的 2.5 倍且至少 15 分钟；没有间隔时使用 30 小时。运行中的 KeepAlive 任务不会因为日志安静而变黄。

**已知限制：**

- 系统域只扫描定义，没有独立查询系统运行态。因此系统配置显示为待确认，必须用对应 launchd 域再次核对。
- 条件式 KeepAlive 可能合理地没有进程，已加载的此类任务仍需结合条件复核。
- 当前使用 XML 文本解析 plist，不完整支持二进制 plist 和所有配置形式；StartCalendarInterval 没有解析展示。解析失败的条目可能被跳过。
- 相同 label 的用户/系统任务会被合并，尚未按域建立独立身份。
- 普通进程匹配 Node、Python、npm/npx、uv/uvicorn/gunicorn、nohup、PM2、tsx/Vite、Bun、Deno 等运行时，并合并它们的子进程；不覆盖所有任意名称的后台可执行程序，不进入容器或远端机器。仅采集当前用户，其他用户和系统进程的资源可能不可用。
- `ps` CPU 为系统提供的平均值，单核 100%，多进程合计可超过 100%；RSS 为成员相加，可能重复计算共享内存，不能等同于独占内存或耗电量。仅展示 TCP LISTEN，不是网络流量或 UDP 占用。`—` 表示不可用，`∅` 表示此次查询无 TCP 监听。查询缺口仅保留在 JSON 的 `processes.gaps`，主页面不展示该提示。
- 按工作目录及最近 Git 根目录/项目标记推断项目；静态服务优先参考可识别的 `--directory`。工具名称按本机命令和目录规则识别，不能证明由谁创建。同项目/同工具的多个独立实例在一行汇总，详情保留成员身份；已有 launchd 子树合并回原任务，不重复展示。
- 进程显示 ✓ 仅代表观测到运行，不验证业务健康。退出的普通进程会从下次快照消失；没有历史登记便无法判断它本来是否应该持续运行。
- 没有推送通知、新增任务历史、CPU/内存排序、耗电测量或自动清理。

## 隐私和操作边界

看板不自带遥测或云端上传。它会读取本机任务定义、参数和文件时间，并在首次运行时写入 launchd 说明模板；不把临时进程组写入持久说明文件；它不直接启动、停止或重启任务。

快照包含主机名、路径、程序参数和用途说明，参数可能含凭据。只在可信的本机 DSH 环境使用，不要把接口公开到互联网，也不要原样分享真实快照。发送 Agent 草稿及后续日志时，数据处理取决于你选择的宿主和模型提供方。日志、任务名、说明和脚本都应作为不可信证据，不能作为修改系统的授权。

## 开发与验证

使用 Node.js 22，无需安装额外 npm 依赖即可运行当前检查：

```sh
npm run check
npm test
```

测试覆盖解析、父子合并、launchd 去重、项目与工具分组、端口缺失、身份变化，以及右键草稿约束，不覆盖真实修复、停用或省电效果。DSH 验收需要另行确认侧边栏、看板、右键菜单及草稿填入；本次在本机 DSH 0.2.1-rc.2 验证了常驻任务/运行进程两个平铺列表、中英文切换、图标状态、端口列、项目进程右键菜单和解释草稿填入；没有发送修复或停用请求，也没有测量省电效果。

文件分工：`index.js` launchd 采集与 JSON 接口；`processes.js` 本机进程采集与分组；`client.js` 看板与 Agent 草稿；`locale/` 展示名称；`cordis.patch.yml` DSH bundle 注册；`tests/` 聚焦测试。
