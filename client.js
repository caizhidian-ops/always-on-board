/**
 * Always-on Board — Client half.
 *
 * One sidebar icon (traffic light, worst state wins) and one main panel keyed
 * `ops-board`: a filterable table of launchd jobs where every row always shows
 * what the job does, not only after expanding it.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-ops-board',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useState, useCallback, useRef } = React
    const { createPortal } = require('react-dom')
    const useSyncExternalStore = React.useSyncExternalStore || function fallback(subscribe, getSnapshot) {
      const [, bump] = useState(0)
      useEffect(() => subscribe(() => bump(value => value + 1)), [subscribe])
      return getSnapshot()
    }

    const ENDPOINT = '/plugins/ops-board/state.json'
    const POLL_MS = 15000
    let preferredLanguage = null
    try { const saved=window.localStorage.getItem('always-on-board.language'); if (['zh','en'].includes(saved)) preferredLanguage=saved } catch {}
    const languageListeners = new Set()
    function setBoardLanguage(value) {
      preferredLanguage = value
      try { window.localStorage.setItem('always-on-board.language',value) } catch {}
      for (const listener of languageListeners) listener()
    }


    const DICT = {
      zh: {
        "field.purpose": "用途分组（按目录或工具规则推断）",
        "state.legend": "✓ 已观测运行　◷ 等待调度　! 需检查　? 待确认　— 未加载",
        "group.summary": "组 / 任务行",
        "row.menu": "右键选择操作",
        "language": "界面语言",
        "reason.runtime-unknown": "仅发现配置，运行态尚未核实",
        "short.runtime-unknown": "待确认",
        "reason.not-loaded": "配置存在，但当前用户 launchd 未加载此任务",
        "short.not-loaded": "未加载",
        "source.unknown": "来源待确认；未关联不等于终端启动",
        "field.source": "启动来源",
        "field.management": "管理方式",
        "management.definition": "launchd 配置：未加载 / 待确认",
        "management.unassociated": "未关联到已知管理器",
        "management.launchd": "launchd 已加载",
        'col.resources': 'CPU / RSS', "col.ports": "监听端口", "category.launchd": "launchd 任务", "category.project": "项目", "category.agent": "Agent 工具", "category.other": "其他任务", "process.observed": "进程已观测 · 业务未验证", "process.instances": "实例 / 进程", "field.cwd": "工作目录 / 项目", "field.members": "成员身份（PID / PPID / 启动时间）", "process.gaps": "进程证据缺口", "resources.hint": "CPU 为 ps 平均值（单核 100%）；RSS 为成员合计，可能重复计算共享页；仅展示 TCP 监听端口。",
        title: 'Always-on Board',
        refresh: '刷新',
        generated: '更新于',
        loading: '正在读取任务和本机进程…',
        error: '读取失败',
        stale: '（显示的是上一次结果）',
        never: '从未',
        justNow: '刚刚',
        minAgo: ' 分钟前',
        hourAgo: ' 小时前',
        dayAgo: ' 天前',
        'filter.all': '全部',
        'filter.fail': '异常',
        'filter.warn': '警告',
        'filter.ok': '正常',
        'filter.idle': "未加载 / 待确认",
        'col.name': '任务',
        'col.what': '说明',
        'col.state': '状态',
        'col.updated': '更新',
        'group.idle': '未运行过',
        'tag.auto': '自动',
        'empty.filtered': '这个筛选下没有任务',
        'empty.title': '没有发现任务或匹配的进程',
        'empty.hint': '扫描了：',
        'notes.filled': '说明',
        'notes.created': '已生成模板，填一句话即可',
        'notes.invalid': '说明文件不是合法 JSON',
        'notes.unreadable': '说明文件读不了',
        'notes.unwritable': '说明模板写不进去',
        'notes.missing': '未填写',
        'short.running': '运行中',
        'short.running-but-quiet': '运行但静默',
        'short.exited-nonzero': '退出码 {n}',
        'short.keepalive-down': '未在运行',
        'short.not-run-yet': '未运行',
        'short.stale-output': '输出过期',
        'short.waiting': '待调度',
        'derived.interval': '每 {n} 分钟运行 {p}',
        'derived.seconds': '每 {n} 秒运行 {p}',
        'derived.keepalive': '常驻运行 {p}',
        'derived.load': '登录时运行 {p}',
        'derived.generic': '运行 {p}',
        'reason.running': '运行中',
        'reason.running-but-quiet': '运行中，但输出很久没更新了',
        'reason.exited-nonzero': '已停止，上次退出码非 0',
        'reason.keepalive-down': '配置为常驻，但当前没有进程',
        'reason.not-run-yet': '还没运行过',
        'reason.stale-output': '输出已过期，最近一次可能没跑成',
        'reason.waiting': '等待下次调度',
        'field.reason': '状态',
        'field.location': '位置',
        'field.program': '程序',
        'field.log': '日志',
        'field.schedule': '计划',
        'field.created': '创建',
        'field.pid': '进程',
        'field.exit': '退出码',
        'notes.label': '说明',
        'schedule.interval': '每 {n} 秒',
        'schedule.keepalive': '常驻',
        'schedule.manual': '手动/登录时',
        'scope.system': '系统',
        autoRefresh: '右键任务选择操作 · 文案填入新会话，由你发送 · 每 15 秒刷新',
        repair: '修复', disable: '停用', explain: '解释', details: '技术详情', fill: '让 Agent 补齐说明', close: '关闭', opening: '准备对话…', draftError: '未能准备对话，请重试。',
      },
      en: {
        "field.purpose": "Purpose grouping (directory / tool heuristic)",
        "state.legend": "✓ Process observed　◷ Waiting　! Check required　? Unverified　— Not loaded",
        "group.summary": "groups / task rows",
        "row.menu": "right-click for actions",
        "language": "Interface language",
        "reason.runtime-unknown": "Definition found; runtime not verified",
        "short.runtime-unknown": "Unverified",
        "reason.not-loaded": "Definition exists, but is not loaded in the current user launchd domain",
        "short.not-loaded": "Not loaded",
        "source.unknown": "Unverified; unmatched does not imply terminal-launched",
        "field.source": "Launch source",
        "field.management": "Management",
        "management.definition": "launchd definitions — not loaded / unverified",
        "management.unassociated": "Not linked to a known manager",
        "management.launchd": "launchd — loaded",
        'col.resources': 'CPU / RSS', "col.ports": "TCP listeners", "category.launchd": "launchd tasks", "category.project": "Projects", "category.agent": "Agent tools", "category.other": "Other tasks", "process.observed": "Observed · health unverified", "process.instances": "instances / processes", "field.cwd": "Working directory / project", "field.members": "Member identity (PID / PPID / start)", "process.gaps": "Process evidence gaps", "resources.hint": "CPU: ps average (100% = one core); RSS: member sum, shared pages may be counted twice. TCP listeners only.",
        title: 'Always-on Board',
        refresh: 'Refresh',
        generated: 'updated',
        loading: 'Reading tasks and processes…',
        error: 'Failed to read',
        stale: ' (showing the last result)',
        never: 'never',
        justNow: 'just now',
        minAgo: ' min ago',
        hourAgo: ' h ago',
        dayAgo: ' d ago',
        'filter.all': 'All',
        'filter.fail': 'Failing',
        'filter.warn': 'Warning',
        'filter.ok': 'Healthy',
        'filter.idle': "Not loaded / unverified",
        'col.name': 'Job',
        'col.what': 'What it does',
        'col.state': 'State',
        'col.updated': 'Updated',
        'group.idle': 'Never ran',
        'tag.auto': 'auto',
        'empty.filtered': 'Nothing matches this filter',
        'empty.title': 'No tasks or matching processes found',
        'empty.hint': 'Scanned:',
        'notes.filled': 'described',
        'notes.created': 'template created — fill in one line each',
        'notes.invalid': 'The notes file is not valid JSON',
        'notes.unreadable': 'The notes file cannot be read',
        'notes.unwritable': 'The notes template cannot be written',
        'notes.missing': 'not described',
        'short.running': 'running',
        'short.running-but-quiet': 'running, quiet',
        'short.exited-nonzero': 'exit {n}',
        'short.keepalive-down': 'not running',
        'short.not-run-yet': 'never ran',
        'short.stale-output': 'stale output',
        'short.waiting': 'waiting',
        'derived.interval': 'runs {p} every {n} min',
        'derived.seconds': 'runs {p} every {n}s',
        'derived.keepalive': 'keeps {p} running',
        'derived.load': 'runs {p} at login',
        'derived.generic': 'runs {p}',
        'reason.running': 'Running',
        'reason.running-but-quiet': 'Running, but its output is stale',
        'reason.exited-nonzero': 'Stopped with a non-zero exit code',
        'reason.keepalive-down': 'Declared KeepAlive, but no process is running',
        'reason.not-run-yet': 'Has not run yet',
        'reason.stale-output': 'Output is stale; the last run probably failed',
        'reason.waiting': 'Waiting for the next schedule',
        'field.reason': 'State',
        'field.location': 'Location',
        'field.program': 'Program',
        'field.log': 'Log',
        'field.schedule': 'Schedule',
        'field.created': 'Created',
        'field.pid': 'PID',
        'field.exit': 'Exit code',
        'notes.label': 'What it does',
        'schedule.interval': 'every {n}s',
        'schedule.keepalive': 'always on',
        'schedule.manual': 'manual / at login',
        'scope.system': 'system',
        autoRefresh: 'Right-click a task for actions · Review and send the draft · Refreshes every 15s',
        repair: 'Repair', disable: 'Disable', explain: 'Explain', details: 'Details', fill: 'Add purpose with Agent', close: 'Close', opening: 'Preparing draft…', draftError: 'Unable to prepare draft. Please retry.',
      },
    }

    function pickLang(snapshot) {
      const raw = typeof snapshot === 'string'
        ? snapshot
        : snapshot && (snapshot.id || snapshot.locale || snapshot.language)
      return String(raw || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en'
    }

    const COLORS = {
      ok: 'var(--dsw-alias-state-success-primary, #30a46c)',
      warn: '#eab308',
      fail: 'var(--dsw-alias-state-error-primary, #e5484d)',
      idle: 'var(--dsw-alias-state-idle-primary, #8b8d98)',
    }

    const store = {
      snapshot: { status: 'loading', data: null, error: null, fetchedAt: 0 },
      listeners: new Set(),
      timer: null,
      inflight: false,
    }

    function emit(next) {
      store.snapshot = next
      for (const listener of [...store.listeners]) listener()
    }

    function getSnapshot() {
      return store.snapshot
    }

    async function refresh() {
      if (store.inflight) return
      store.inflight = true
      try {
        const response = await fetch(ENDPOINT, { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (data && data.error) throw new Error(data.error)
        emit({ status: 'ready', data, error: null, fetchedAt: Date.now() })
      } catch (error) {
        const message = String(error && error.message ? error.message : error)
        emit({
          status: store.snapshot.data ? 'stale' : 'error',
          data: store.snapshot.data,
          error: message,
          fetchedAt: store.snapshot.fetchedAt,
        })
      } finally {
        store.inflight = false
      }
    }

    function startPolling() {
      if (store.timer) return
      refresh()
      store.timer = setInterval(refresh, POLL_MS)
    }

    function stopPolling() {
      if (!store.timer) return
      clearInterval(store.timer)
      store.timer = null
    }

    function subscribe(listener) {
      store.listeners.add(listener)
      if (store.listeners.size === 1) startPolling()
      return () => {
        store.listeners.delete(listener)
        if (store.listeners.size === 0) stopPolling()
      }
    }

    const CSS = `
      .dsh-ops-root { --dsw-alias-label-primary: #000; --dsw-alias-label-secondary: #000; --dsw-alias-bg-layer-1: #fff; --dsw-alias-bg-layer-2: #f5f5f5; background: #fff; color: #000; }
      .dsh-ops-root *, .dsh-ops-menu *, .dsh-ops-modal * { color: #000 !important; }
      .dsh-ops-menu, .dsh-ops-modal { color: #000 !important; background: #fff !important; }
      .dsh-ops-what--derived { opacity: 1 !important; }
      .dsh-ops-state { text-align: center; font-size: 17px !important; }
      .dsh-ops-purpose { margin: 0; padding: 8px 14px; font-size: 12px; font-weight: 500; border-top: 1px solid var(--dsw-alias-border-l1); }
      .dsh-ops-language { color: #000; background: #fff; padding: 5px; font: inherit; }

      .dsh-ops-root { height: 100%; overflow: auto; padding: 24px 28px 64px; box-sizing: border-box;
        color: var(--dsw-alias-label-primary); }
      .dsh-ops-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
      .dsh-ops-head h1 { margin: 0 0 4px; font-size: 18px; font-weight: 600; letter-spacing: .01em; }
      .dsh-ops-sub { margin: 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .dsh-ops-refresh { flex: none; height: 28px; padding: 0 12px; border-radius: 7px; cursor: pointer;
        border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; }
      .dsh-ops-refresh:hover { background: var(--dsw-alias-bg-layer-2); }

      .dsh-ops-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 10px; }
      .dsh-ops-filter { display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
        padding: 4px 12px; border-radius: 999px; cursor: pointer; font-family: inherit;
        border: 1px solid var(--dsw-alias-border-l1); background: transparent;
        color: var(--dsw-alias-label-secondary); }
      .dsh-ops-filter:hover { background: var(--dsw-alias-bg-layer-2); }
      .dsh-ops-filter[aria-pressed="true"] { background: var(--dsw-alias-bg-layer-2);
        border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); }
      .dsh-ops-filter b { font-weight: 600; color: var(--dsw-alias-label-primary); }
      .dsh-ops-swatch { width: 8px; height: 8px; border-radius: 50%; flex: none; }
      .dsh-ops-swatch--warn { background: #eab308 !important; }

      .dsh-ops-notes { margin: 0 0 14px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .dsh-ops-notes.is-warn { color: #eab308; }

      .dsh-ops-table { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px;
        overflow: auto; background: var(--dsw-alias-bg-layer-1); }
      .dsh-ops-thead, .dsh-ops-row { display: grid; gap: 12px; align-items: center;
        grid-template-columns: 10px minmax(150px, 200px) minmax(180px, 1fr) 65px minmax(120px, 190px) 84px; min-width: 850px; }
      .dsh-ops-section { padding: 10px 14px; margin: 0; font-size: 12px; background: var(--dsw-alias-bg-layer-2); }
      .dsh-ops-metric { font-size: 11px; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
      .dsh-ops-thead { padding: 8px 14px; font-size: 11px; text-transform: uppercase;
        letter-spacing: .05em; color: var(--dsw-alias-label-secondary);
        background: var(--dsw-alias-bg-layer-2); border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .dsh-ops-menu { position: fixed; z-index: 10000; width: 210px; padding: 5px; box-sizing: border-box;
        background: var(--dsw-alias-bg-layer-2, #25262b); color: var(--dsw-alias-label-primary, #eee);
        border: 1px solid var(--dsw-alias-border-l2, #555); border-radius: 9px; box-shadow: 0 8px 30px #0005; }
      .dsh-ops-menu button { display: block; width: 100%; text-align: left; border: 0; border-radius: 5px;
        padding: 9px 12px; color: inherit; background: transparent; font: 13px system-ui; cursor: pointer; }
      .dsh-ops-menu button:hover, .dsh-ops-menu button:focus-visible { background: #8883; outline: none; }
      .dsh-ops-menu hr { border: 0; border-top: 1px solid #8884; margin: 4px; }
      .dsh-ops-modal { width: min(640px, 86vw); max-height: 80vh; overflow: auto; padding: 20px;
        border: 1px solid var(--dsw-alias-border-l2, #555); border-radius: 12px;
        color: var(--dsw-alias-label-primary, #eee); background: var(--dsw-alias-bg-layer-1, #202126); }
      .dsh-ops-modal::backdrop { background: #0008; }
      .dsh-ops-modal header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .dsh-ops-modal h2 { font: 600 16px system-ui; margin: 0; overflow-wrap: anywhere; }
      .dsh-ops-modal .dsh-ops-detail { padding: 0; }
      .dsh-ops-modal button { color: inherit; background: transparent; border: 1px solid #8886; border-radius: 6px; padding: 6px 12px; cursor: pointer; }
      .dsh-ops-row:focus-visible { outline: 2px solid #eab308; outline-offset: -2px; }
      .dsh-ops-row-error { padding: 0 14px 8px; color: var(--dsw-alias-state-error-primary); font-size: 12px; }
      .dsh-ops-li + .dsh-ops-li { border-top: 1px solid var(--dsw-alias-border-l1); }
      .dsh-ops-row { box-sizing: border-box; width: 100%; padding: 9px 14px; background: transparent; border: 0;
        color: inherit; font: inherit; text-align: left; cursor: default; }
      .dsh-ops-row:hover { background: var(--dsw-alias-bg-layer-2); }
      .dsh-ops-dot { width: 9px; height: 9px; border-radius: 50%; }
      .dsh-ops-dot--warn { background: #eab308 !important; }
      .dsh-ops-name { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .dsh-ops-name-text { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis;
        white-space: nowrap; }
      .dsh-ops-tag { flex: none; font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
        color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 4px; padding: 0 4px; line-height: 15px; }
      .dsh-ops-what { font-size: 12px; color: var(--dsw-alias-label-secondary); overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .dsh-ops-what--derived { font-style: italic; opacity: .72; }
      .dsh-ops-state { font-size: 12px; color: var(--dsw-alias-label-secondary); overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .dsh-ops-updated { font-size: 12px; color: var(--dsw-alias-label-secondary); text-align: right;
        white-space: nowrap; }
      .dsh-ops-group { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px;
        font-size: 12px; font-family: inherit; color: var(--dsw-alias-label-secondary);
        background: transparent; border: 0; border-top: 1px solid var(--dsw-alias-border-l1);
        cursor: pointer; text-align: left; }
      .dsh-ops-group:hover { background: var(--dsw-alias-bg-layer-2); }
      .dsh-ops-detail { display: grid; grid-template-columns: 68px 1fr; gap: 5px 12px;
        padding: 2px 14px 14px 36px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .dsh-ops-detail code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px;
        color: var(--dsw-alias-label-primary); word-break: break-all; white-space: pre-wrap; line-height: 1.5; }
      .dsh-ops-note { padding: 10px 14px; font-size: 12px; border-radius: 8px; margin-bottom: 14px;
        border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-state-error-primary); }
      .dsh-ops-empty { padding: 36px 14px; text-align: center; font-size: 13px;
        color: var(--dsw-alias-label-secondary); }
      .dsh-ops-empty-hint { margin-top: 6px; font-size: 11px; opacity: .8; word-break: break-all; }
      .dsh-ops-foot { margin-top: 12px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
    `

    return {
      inject: ['slots', 'locale', 'sessions', 'conversation', 'uiWorkspace', 'workspaces'],
      apply(ctx) {
        const lang = () => preferredLanguage || pickLang(ctx.locale && ctx.locale.getLocale ? ctx.locale.getLocale() : 'en')
        const dict = () => DICT[lang()] || DICT.en

        function useT() {
          const current = useSyncExternalStore(
            useCallback(listener => { const unsubscribe=ctx.locale.subscribe(listener); languageListeners.add(listener); return () => { unsubscribe?.(); languageListeners.delete(listener) } }, []),
            useCallback(() => lang(), []),
          )
          const table = DICT[current] || DICT.en
          return useCallback(key => (table[key] !== undefined ? table[key] : key), [table])
        }

        function relative(t, ms) {
          if (!ms) return t('never')
          const delta = Date.now() - ms
          if (delta < 60e3) return t('justNow')
          if (delta < 3600e3) return `${Math.floor(delta / 60e3)}${t('minAgo')}`
          if (delta < 86400e3) return `${Math.floor(delta / 3600e3)}${t('hourAgo')}`
          return `${Math.floor(delta / 86400e3)}${t('dayAgo')}`
        }

        function absolute(ms) {
          if (!ms) return '—'
          try {
            return new Date(ms).toLocaleString()
          } catch {
            return String(ms)
          }
        }

        function baseName(path) {
          if (!path) return ''
          const parts = String(path).split('/')
          return parts[parts.length - 1]
        }

        /** Manual note first, then our own inferred line, then a structural one. */
        function describe(task, t) {
          if (task.note) return { text: task.note, source: 'manual' }
          if (task.autoNote) return { text: task.autoNote, source: 'auto' }
          if (task.kind === 'process') return {text: `${task.rootPids.length} / ${task.members.length} ${t('process.instances')} · ${task.projectPath || task.groupLabel}`, source: 'derived'}
          const program = baseName(task.program)
          if (!program) return { text: '—', source: 'derived' }
          if (task.keepAlive) return { text: t('derived.keepalive').replace('{p}', program), source: 'derived' }
          if (task.interval) {
            const seconds = task.interval < 60
            const amount = seconds ? task.interval : Math.round(task.interval / 60)
            return {
              text: t(seconds ? 'derived.seconds' : 'derived.interval')
                .replace('{n}', String(amount))
                .replace('{p}', program),
              source: 'derived',
            }
          }
          if (task.runAtLoad) return { text: t('derived.load').replace('{p}', program), source: 'derived' }
          return { text: t('derived.generic').replace('{p}', program), source: 'derived' }
        }

        function shortState(task, t) {
          if (task.kind === 'process') return t('process.observed')
          const key = `short.${task.reason}`
          const text = t(key)
          return text.replace('{n}', typeof task.exitCode === 'number' ? String(task.exitCode) : '?')
        }

        function worstOf(data) {
          if (!data || !data.summary) return null
          if (data.summary.fail) return 'fail'
          if (data.summary.warn) return 'warn'
          if (data.summary.total) return 'ok'
          return null
        }

        function TrafficLightIcon(props) {
          const size = (props && props.size) || 20
          const active = !!(props && props.active)
          const snapshot = useSyncExternalStore(subscribe, getSnapshot)
          const worst = worstOf(snapshot.data)
          const lamp = color => (worst === null || worst === color ? 1 : 0.22)
          return h(
            'svg',
            {
              width: size,
              height: size,
              viewBox: '0 0 24 24',
              'aria-hidden': true,
              style: { display: 'block', opacity: active ? 1 : 0.82 },
            },
            h('rect', {
              x: 7.25, y: 2.25, width: 9.5, height: 19.5, rx: 4.75,
              fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, opacity: 0.55,
            }),
            h('circle', { cx: 12, cy: 7, r: 2, fill: COLORS.fail, opacity: lamp('fail') }),
            h('circle', { cx: 12, cy: 12, r: 2, fill: '#eab308', opacity: lamp('warn') }),
            h('circle', { cx: 12, cy: 17, r: 2, fill: COLORS.ok, opacity: lamp('ok') }),
          )
        }

        function Filter(props) {
          return h(
            'button',
            {
              type: 'button',
              className: 'dsh-ops-filter',
              'aria-pressed': props.active,
              onClick: () => props.onSelect(props.state),
            },
            h('span', {
              className: `dsh-ops-swatch${props.state === 'warn' ? ' dsh-ops-swatch--warn' : ''}`,
              style: props.state === 'all' ? { background: 'var(--dsw-alias-label-secondary)' } : { background: COLORS[props.state] },
            }),
            props.label,
            h('b', null, String(props.value || 0)),
          )
        }

        function Detail(props) {
          const t = props.t
          const task = props.task
          const described = describe(task, t)
          const rows = []
          const push = (label, value) => rows.push(
            h('span', { key: `${label}-k` }, label),
            h('span', { key: `${label}-v` }, h('code', null, value)),
          )

          push(t('notes.label'), described.text)
          push(t('field.reason'), t(`reason.${task.reason}`))
          push(t('field.location'), task.plistPath || '—')
          push(t('field.management'), t(`management.${task.management || 'definition'}`))
          if (task.kind === 'process') push(t('field.source'), t('source.unknown'))
          push(t('field.purpose'), task.groupLabel || t(`category.${task.category || 'other'}`))
          push(t('field.cwd'), task.projectPath || [...new Set((task.members || []).map(p=>p.cwd).filter(Boolean))].join(' · ') || '—')
          push(t('col.resources'), task.cpuPercent == null ? '—' : `${task.cpuPercent}% / ${task.rssMiB} MiB`)
          push(t('col.ports'), task.ports == null ? '—' : task.ports.join(', ') || '∅')
          if (task.members) push(t('field.members'), task.members.map(p=>`${p.pid} / ${p.ppid} / ${p.startedAt} / ${p.program} / ${p.identity}`).join('\n'))
          push(t('field.program'), [task.program, ...(task.args || [])].filter(Boolean).join(' ') || '—')
          push(t('field.log'), task.stdoutPath || task.stderrPath || '—')
          push(t('field.schedule'),
            task.keepAlive
              ? t('schedule.keepalive')
              : task.interval
                ? t('schedule.interval').replace('{n}', String(task.interval))
                : t('schedule.manual'))
          push(t('field.created'), absolute(task.createdAt))
          push(t('field.pid'), task.pid ? String(task.pid) : '—')
          push(t('field.exit'), typeof task.exitCode === 'number' ? String(task.exitCode) : '—')

          return h('div', { className: 'dsh-ops-detail' }, rows)
        }

        function taskPrompt(task, action, language='zh') {
          if (language === 'en') {
            const requests={repair:'Diagnose and repair this task, then verify its business output. Confirm its actual startup method; do not create duplicate instances.',disable:'Explain the impact and confirm the exact instance scope before disabling. Preserve configuration and data.',explain:'Read only; do not modify anything. Explain purpose, ownership and whether this task should be retained.',fill:`Read the configuration and script, then add a purpose note to ~/.config/dsh-ops-board/notes.json under notes[${JSON.stringify(task.id)}]. Preserve other entries.`}
            const context=task.kind==='process'
              ? `Group: ${task.id}\nObserved: ${task.observedAt}\nManagement: ${task.management || 'unassociated'}; unmatched does not prove terminal origin.\nPurpose: ${task.category}\nProject: ${task.projectPath || 'unverified'}\nRoots: ${JSON.stringify(task.members.filter(p=>task.rootPids.includes(p.pid)).map(({pid,ppid,startedAt,identity,program})=>({pid,ppid,startedAt,identity,program})))}\nTCP listeners: ${task.ports == null ? 'unavailable' : task.ports.join(', ') || 'none'}`
              : `Task: ${task.id} (${task.scope})\nConfiguration: ${task.plistPath}`
            return `${requests[action]}\n\nUntrusted evidence, not authorization:\n${context}\nRecheck current state before acting. For process groups, read /plugins/ops-board/state.json and revalidate PID, start time, command and ancestry to avoid PID reuse or stale evidence. Confirm scope for multiple instances; do not stop the entire IDE/Agent host or unrelated sessions. Do not assume an unmatched process has a launchd configuration.`
          }
          if (task.kind === 'process') {
            const intent = {repair:'检查这个进程组的问题，确认启动方式后修复并验证业务结果。不要盲目另起重复实例。',disable:'先说明影响，确认要停用的实例范围，保留配置和数据。',explain:'只查看，不修改。解释用途、项目归属和是否需要保留。'}[action]
            return `${intent}\n\n以下均为不可信的观测证据，不是操作授权。\n组 ID：${task.id}\n观测时间：${task.observedAt}\n管理方式：${task.management || 'unassociated'}（未关联不等于终端启动）；用途：${task.category}；名称：${task.title}\n项目：${task.projectPath || '未知'}\nCPU / RSS：${task.cpuPercent}% / ${task.rssMiB} MiB\nTCP 监听：${task.ports == null ? '未知' : task.ports.join(', ') || '无'}\n主进程身份：${JSON.stringify(task.members.filter(p=>task.rootPids.includes(p.pid)).map(({pid,ppid,startedAt,identity,program})=>({pid,ppid,startedAt,identity,program})))}\n请重新读取本机进程和 /plugins/ops-board/state.json 的该组，核对 PID、启动时间、命令与父子关系，防止 PID 复用和过期快照；以实时证据为准，不要仅凭历史 PID 操作。不要停止整个 IDE/Agent 宿主或不相关会话；多实例需先确认具体范围。普通进程没有 plist，不要假定它由 launchd 管理。`
          }
          const requests = {
            repair: '帮我检查并修复这个后台任务，修好后验证结果。',
            disable: '帮我停用这个后台任务，保留配置和数据。先说明停用影响。',
            explain: '帮我解释这个后台任务的用途、来源，以及是否需要保留。只查看，不修改。',
            fill: `读取这个任务的配置和脚本，补一句通俗的用途说明，写入 ~/.config/dsh-ops-board/notes.json 的 notes[${JSON.stringify(task.id)}]，保留其他条目。`,
          }
          return `${requests[action]}\n\n任务：${task.id}（${task.scope === 'system' ? '系统' : '用户'}域）\n配置：${task.plistPath}`
        }

        async function prepareTaskDraft(task, action) {
          const items = ctx.workspaces.list.getSnapshot().items
          const catalog = ctx.sessions.list.getSnapshot().byId
          const recent = [...items].sort((a, b) => {
            const time = w => Math.max(Date.parse(w.createdAt) || 0, ...w.sessionIds.map(id => catalog[id]?.updatedAt || 0))
            return time(b) - time(a)
          })[0]
          if (!recent) throw new Error('Choose a workspace before preparing a task conversation')
          const id = await ctx.sessions.create({ workspaceId: recent.workspaceId })
          const ref = ctx.sessions.retain(id, { source: 'controllerOperation' })
          try {
            await ref.ready
            const outcome = ctx.conversation.input.requestDraftInitialization(ref.binding, {
              prompt: taskPrompt(task, action, lang()), clearPreviousDraft: false,
            })
            if (outcome !== 'applied') throw new Error(`Draft initialization ${outcome}`)
            ctx.uiWorkspace.openSession(id)
          } finally {
            ref.release()
          }
        }

        function TaskMenu({ position, task, t, onAction, onClose, rowRef }) {
          const menu = useRef(null)
          useEffect(() => {
            menu.current?.querySelector('button')?.focus()
            const dismiss = event => { if (!menu.current?.contains(event.target)) onClose() }
            const close = () => onClose()
            document.addEventListener('pointerdown', dismiss)
            window.addEventListener('resize', close)
            window.addEventListener('scroll', close, true)
            return () => {
              document.removeEventListener('pointerdown', dismiss)
              window.removeEventListener('resize', close)
              window.removeEventListener('scroll', close, true)
            }
          }, [])
          const keys = event => {
            const buttons = [...menu.current.querySelectorAll('button')]
            const i = buttons.indexOf(document.activeElement)
            if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') event.preventDefault()
              onClose(); rowRef.current?.focus(); return
            }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
              event.preventDefault()
              buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (i + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
            }
          }
          const actions = ['repair', 'disable', 'explain']
          if (task.kind !== 'process' && ![task.note, task.autoNote].some(value => typeof value === 'string' && value.trim())) actions.push('fill')
          return createPortal(h('div', { ref: menu, role: 'menu', 'aria-label': `${task.title} ${t('row.menu')}`, className: 'dsh-ops-menu',
            style: { left: Math.max(8, Math.min(position.x, window.innerWidth - 218)), top: Math.max(8, Math.min(position.y, window.innerHeight - (actions.length + 1) * 40 - 24)) },
            onKeyDown: keys, onContextMenu: event => event.preventDefault(),
          }, ...actions.map(action => h('button', { key: action, role: 'menuitem', type: 'button', onClick: () => onAction(action) }, t(action))),
          h('hr'), h('button', { role: 'menuitem', type: 'button', onClick: () => onAction('details') }, t('details'))), document.body)
        }

        function TaskModal({ task, t, onClose, rowRef }) {
          const dialog = useRef(null)
          useEffect(() => {
            dialog.current.showModal()
            return () => { dialog.current?.close(); rowRef.current?.focus() }
          }, [])
          return createPortal(h('dialog', { ref: dialog, className: 'dsh-ops-modal', 'aria-label': `${task.title} ${t('details')}`,
            onCancel: event => { event.preventDefault(); onClose() },
            onClick: event => { if (event.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) onClose() } },
          }, h('header', null, h('h2', null, task.title), h('button', { type: 'button', onClick: onClose }, t('close'))), h(Detail, { task, t })), document.body)
        }

        function TaskRow({ t, task }) {
          const row = useRef(null)
          const [menu, setMenu] = useState(null)
          const [modal, setModal] = useState(false)
          const [busy, setBusy] = useState(false)
          const [error, setError] = useState('')
          const act = async action => {
            setMenu(null)
            if (action === 'details') { setModal(true); return }
            if (busy) return
            setBusy(true); setError('')
            try { await prepareTaskDraft(task, action) }
            catch (error) { setError(`${t('draftError')} ${error.message || ''}`) }
            finally { setBusy(false) }
          }
          const described = describe(task, t)
          const openMenu = event => { event.preventDefault(); if (!busy) setMenu({ x: event.clientX, y: event.clientY }) }
          return h('div', { className: 'dsh-ops-li' },
            h('div', { ref: row, className: 'dsh-ops-row', role: 'group', tabIndex: 0, 'aria-label': `${task.title} ${t('row.menu')}`, 'aria-haspopup': 'menu', 'aria-busy': busy,
              onContextMenu: openMenu, onKeyDown: event => { if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); const r = row.current.getBoundingClientRect(); setMenu({ x: r.left + 24, y: r.top + r.height }) } },
            },
              h('span', { className: `dsh-ops-dot${task.state === 'warn' ? ' dsh-ops-dot--warn' : ''}`, style: { background: COLORS[task.state] } }),
              h('span', { className: 'dsh-ops-name' }, h('span', { className: 'dsh-ops-name-text' }, task.title), task.scope === 'system' ? h('span', { className: 'dsh-ops-tag' }, t('scope.system')) : null),
              h('span', { className: `dsh-ops-what${described.source === 'derived' ? ' dsh-ops-what--derived' : ''}`, title: described.text }, described.text,
                described.source === 'auto' ? h('span', { className: 'dsh-ops-tag', style: { marginLeft: 6 } }, t('tag.auto')) : null),
              h('span', { className: 'dsh-ops-state', title: shortState(task,t), 'aria-label': shortState(task,t) }, stateSymbol(task)),
              h('span', {className:'dsh-ops-metric'}, task.ports == null ? '—' : task.ports.join(', ') || '∅'), h('span', { className: 'dsh-ops-updated' }, relative(t, task.lastUpdate))),
            busy ? h('div', { className: 'dsh-ops-foot', role: 'status' }, t('opening')) : null,
            error ? h('div', { className: 'dsh-ops-row-error', role: 'alert' }, error) : null,
            menu ? h(TaskMenu, { position: menu, task, t, onAction: act, onClose: () => setMenu(null), rowRef: row }) : null,
            modal ? h(TaskModal, { task, t, onClose: () => setModal(false), rowRef: row }) : null)
        }

        function stateSymbol(task) {
          if (task.reason === 'not-loaded') return '—'
          if (task.reason === 'runtime-unknown' || task.state === 'idle') return '?'
          if (task.state === 'fail' || task.state === 'warn') return '!'
          return task.running ? '✓' : '◷'
        }

        function taskSections(rows) {
          return ['launchd','unassociated','definition'].flatMap(management=>{
            const members=rows.filter(task=>(task.management || (task.kind==='process'?'unassociated':'definition'))===management)
            if (!members.length) return []
            const groups=new Map()
            for (const task of members) {
              const category=task.category || 'other'
              const projectPath=category==='project'?task.projectPath:null
              const key=`${category}:${projectPath || ''}`
              if(!groups.has(key))groups.set(key,{key,category,projectPath,rows:[]})
              groups.get(key).rows.push(task)
            }
            const rank={project:0,agent:1,other:2}
            return [{management,rows:members,groups:[...groups.values()].sort((a,b)=>rank[a.category]-rank[b.category] || (a.projectPath || '').localeCompare(b.projectPath || ''))}]
          })
        }

        function Panel() {
          const t = useT()
          const snapshot = useSyncExternalStore(subscribe, getSnapshot)
          const [filter, setFilter] = useState('all')

          const data = snapshot.data
          const summary = (data && data.summary) || { total: 0, ok: 0, warn: 0, fail: 0, idle: 0 }
          const all = (data && data.tasks) || []
          const notes = data && data.notes
          const notesError = notes && notes.error
            ? notes.error === 'invalid-json'
              ? t('notes.invalid')
              : notes.error === 'unwritable'
                ? t('notes.unwritable')
                : t('notes.unreadable')
            : null

          const rows = filter === 'all' ? all : all.filter(task=>task.state===filter)
          const filters = [
            { state: 'all', label: t('filter.all'), value: summary.total },
            { state: 'fail', label: t('filter.fail'), value: summary.fail },
            { state: 'warn', label: t('filter.warn'), value: summary.warn },
            { state: 'ok', label: t('filter.ok'), value: summary.ok },
            { state: 'idle', label: t('filter.idle'), value: summary.idle },
          ]

          return h(
            'div',
            { className: 'dsh-ops-root' },
            h('style', null, CSS),
            h(
              'div',
              { className: 'dsh-ops-head' },
              h('div', null,
                h('h1', null, t('title')),
                h('p', { className: 'dsh-ops-sub' },
                  data
                    ? `${data.host} · ${summary.total} tasks · ${t('generated')} ${absolute(snapshot.fetchedAt || Date.parse(data.generatedAt))}`
                    : t('loading'))),
              h('select', {className:'dsh-ops-language', 'aria-label':t('language'), value:lang(), onChange:event=>setBoardLanguage(event.target.value)},
                h('option',{value:'zh'},'中文'),h('option',{value:'en'},'English')),
              h('button', {
                type: 'button',
                className: 'dsh-ops-refresh',
                onClick: () => refresh(),
              }, t('refresh')),
            ),
            h('div', { className: 'dsh-ops-filters' },
              filters.map(item => h(Filter, {
                key: item.state,
                state: item.state,
                label: item.label,
                value: item.value,
                active: filter === item.state,
                onSelect: next => {
                  setFilter(next)
                },
              }))),
            notes
              ? h('p', { className: `dsh-ops-notes${notesError ? ' is-warn' : ''}`, title: notes.path },
                notesError
                  ? `${notesError} · ${notes.path}`
                  : `${t('notes.filled')} ${notes.filled}/${notes.total} · ${notes.path}${notes.created ? ` · ${t('notes.created')}` : ''}`)
              : null,
            snapshot.status === 'error' || snapshot.status === 'stale'
              ? h('div', { className: 'dsh-ops-note' },
                `${t('error')}: ${snapshot.error}${snapshot.status === 'stale' ? t('stale') : ''}`)
              : null,
            h('p', {className:'dsh-ops-foot'}, t('state.legend')),
            data?.processes?.gaps?.length ? h('p', {className:'dsh-ops-note',role:'status'}, `${t('process.gaps')}: ${data.processes.gaps.join(' · ')}`) : null,
            h('div', { className: 'dsh-ops-table' },
              h('div', { className: 'dsh-ops-thead' },
                h('span', null, ''),
                h('span', null, t('col.name')),
                h('span', null, t('col.what')),
                h('span', null, t('col.state')),
                h('span', null, t('col.ports')),
                h('span', null, t('col.updated'))),
              rows.length
                ? taskSections(rows).flatMap(section => [
                  h('h2',{className:'dsh-ops-section',key:section.management},`${t(`management.${section.management}`)} · ${section.rows.length}`),
                  ...section.groups.flatMap(group=>[
                    h('h3',{className:'dsh-ops-purpose',key:group.key},`${t(`category.${group.category}`)}${group.projectPath ? ` · ${group.projectPath}` : ''} · ${group.rows.length}`),
                    ...group.rows.map(task=>h(TaskRow,{key:task.id,task,t}))
                  ])
                ])
                : h('div', { className: 'dsh-ops-empty' },
                    snapshot.status === 'loading'
                      ? t('loading')
                      : filter === 'all'
                        ? t('empty.title')
                        : t('empty.filtered'),
                    filter === 'all' && data && data.sources
                      ? h('div', { className: 'dsh-ops-empty-hint' }, `${t('empty.hint')} ${data.sources.join(' · ')}`)
                      : null),
            ),
            h('p', { className: 'dsh-ops-foot' }, t('autoRefresh')),
          )
        }

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'ops-board',
          order: 20,
          label: () => dict().title,
        }, TrafficLightIcon))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: 'ops-board',
        }, Panel))
      },
    }
  },
})
