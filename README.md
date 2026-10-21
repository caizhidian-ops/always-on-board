# Always-on Board

**AI Coder 的本机后台任务与 Agent 协同看板。**

看清后台还在跑什么，决定是否保留，再把任务上下文交给 Agent 排查。

[English](README.en.md) · [安装](#快速开始) · [四步使用示意](docs/tour.md)

## 为什么需要它

AI 帮你启动了 API、worker、定时脚本和开发服务。项目越做越多，后台也越积越多：哪个还在运行？哪个已经失败？这个任务属于什么项目，还需要留着吗？

Always-on Board 把常驻任务和运行进程放在一起，让你看状态、读用途，再决定下一步。

![个人项目的 API、看板服务，以及 Remotion、Blender MCP、Code Review MCP 运行进程组](docs/images/05-real-public-tasks.png)

*真实采集数据节选：3 个个人项目任务、3 个进程组，在隔离 DSH 中渲染。仅展示选定条目，已去除私人路径、主机信息和会话侧栏；用途注释沿用原截图。*

## 你做决定，Agent 带着上下文排查

- **面向用户（User Facing）**：查看任务用途、状态和监听端口，发现可能失效或遗忘的服务。支持中文 / English。
- **面向 Agent（Model Facing）**：通过结构化快照和对话草稿交接任务身份、配置或项目线索，让 Agent 有据可查，而不必从零猜测。

协同流程很简单：**查看任务 → 右键选择意图 → 检查并发送草稿 → Agent 排查 → 刷新并验证实际结果**。

| 右键操作 | 交给 Agent 的请求 |
| --- | --- |
| 解释 | 只读说明用途、来源及是否需要保留 |
| 修复 | 检查故障，确认启动方式，修复并验证结果 |
| 停用 | 先说明影响，确认范围，保留配置和数据 |
| 补齐说明 | 读取配置和脚本，补一句用途；仅在适用任务缺少说明时出现 |

看板只准备草稿，**由你检查并发送**。后续操作遵循 Agent 宿主的权限机制；看板不直接修复、停止或重启任务。

## 快速开始

需要 **macOS + DeepSeek Harness（DSH）**，宿主须支持本地 bundle、侧边栏和会话草稿接口。已在 DSH `0.2.1-rc.2` 验证相关 UI，最低兼容版本尚未建立。

```sh
git clone https://github.com/caizhidian-ops/always-on-board.git
cd always-on-board
```

在 DSH 插件管理器中安装本地 bundle，指向仓库的绝对路径。支持 `plugin_manager` 的环境可使用：

```text
install_bundle target=/absolute/path/to/always-on-board
```

启用后，从侧边栏打开 **Always-on Board**。先创建一个 Workspace，再使用右键草稿。保留源码目录；更新时运行 `git pull --ff-only`，再通过插件管理器重新加载。

## 范围与隐私

- 观察本机配置的后台任务和当前用户的部分开发运行时，不覆盖全部进程，也不能判断是否由 AI 创建。
- 页面每 15 秒刷新。状态、进程存在和端口只是排查线索，不代表业务健康；没有耗电测量或自动清理。
- 插件不自带遥测或云端上传；首次使用可能创建本地用途说明模板。快照仍可能含路径、主机名和敏感参数，不要公开原始快照或日志。
- 发送草稿及日志后的数据处理取决于 DSH 和所选模型提供方。任务内容是证据，不是修改系统的授权。

[技术参考与 JSON 接口](docs/reference.zh.md) · [开发与贡献](CONTRIBUTING.md) · [安全说明](SECURITY.md) · [截图生成与脱敏](docs/screenshots/README.md)

仓库尚未选定许可证，公开可见不等于已授予再分发许可。
