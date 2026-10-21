/**
 * Always-on Board — Host half.
 *
 * Enumerates the launchd jobs declared on this machine (user LaunchAgents and
 * system LaunchDaemons), joins them with `launchctl list` and the job's own log
 * timestamps, and serves one read-only JSON snapshot to the Web client.
 *
 * Nothing here writes, starts, stops or restarts a job: the board only reports.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir, hostname } from 'node:os'
import { basename, dirname, join } from 'node:path'

const execFileAsync = promisify(execFile)

export const name = 'ops-board'
export const inject = ['webServer']

const STATE_PATH = '/plugins/ops-board/state.json'
const CACHE_MS = 5000

/** The user-owned, hand-edited file behind the "what is this job?" line. */
const NOTES_PATH = join(homedir(), '.config', 'dsh-ops-board', 'notes.json')

/** Optional override file for our own inferred explanations. */
const AUTO_PATH = join(homedir(), '.config', 'dsh-ops-board', 'auto.json')

/**
 * Our own one-line explanations, written from each job's plist and script,
 * deliberately not copied from the job's own documentation. A note in
 * notes.json always wins; an empty string here hides the inferred line.
 */
const AUTO_DEFAULTS = {
  // — 系统/厂商组件 —
  'com.docker.socket': 'Docker Desktop 的权限助手，给引擎建套接字',
  'com.docker.vmnetd': 'Docker Desktop 的虚拟机网络守护进程',
  'com.expressvpn.expressvpnd': 'ExpressVPN 的常驻守护进程',
  'com.sangfor.EasyMonitor': '深信服 EasyConnect 的监控组件（VPN 客户端）',
  'com.strongvpn.StrongVPN2-Helper': 'StrongVPN 的权限助手',
  'com.west2online.ClashX.ProxyConfigHelper': 'ClashX 的助手，负责改系统代理设置',
  'net.tunnelblick.tunnelblick.tunnelblickd': 'Tunnelblick（OpenVPN 客户端）的守护进程',
  'com.google.GoogleUpdater.wake': 'Chrome 的自动更新器，定时唤醒查新版',
  'com.google.keystone.agent': 'Chrome 更新框架 Keystone 的后台代理',
  'com.google.keystone.xpcservice': 'Chrome 更新框架 Keystone 的 XPC 服务',
  'com.microsoft.office.licensingV2.helper': 'Office 的授权校验助手',
  'com.oracle.java.Helper-Tool': 'Java 插件的自动更新助手',
  'com.razer.UninstallerWatcher': '雷蛇驱动的卸载监视器',
  'com.openai.atlas.update-helper': 'ChatGPT Atlas 浏览器的更新助手',
  'com.lwouis.alt-tab-macos': 'AltTab 窗口切换工具的后台进程',
  'com.valvesoftware.steamclean': 'Steam 的清理辅助程序',
  'netdisk_service': '百度网盘的后台同步服务',
}

/** Where launchd job definitions live, and how each directory is labelled. */
const SOURCES = [
  { dir: join(homedir(), 'Library', 'LaunchAgents'), scope: 'user' },
  { dir: '/Library/LaunchDaemons', scope: 'system' },
]

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readString(xml, key) {
  const match = xml.match(new RegExp(`<key>${escapeRe(key)}</key>\\s*<string>([\\s\\S]*?)</string>`))
  return match ? match[1].trim() : undefined
}

function readInteger(xml, key) {
  const match = xml.match(new RegExp(`<key>${escapeRe(key)}</key>\\s*<integer>(-?\\d+)</integer>`))
  return match ? Number(match[1]) : undefined
}

function readBoolean(xml, key) {
  if (new RegExp(`<key>${escapeRe(key)}</key>\\s*<true\\s*/>`).test(xml)) return true
  if (new RegExp(`<key>${escapeRe(key)}</key>\\s*<false\\s*/>`).test(xml)) return false
  // KeepAlive may also be a dictionary; treat its presence as "wants to stay up".
  if (new RegExp(`<key>${escapeRe(key)}</key>\\s*<dict>`).test(xml)) return true
  return undefined
}

function readArray(xml, key) {
  const block = xml.match(new RegExp(`<key>${escapeRe(key)}</key>\\s*<array>([\\s\\S]*?)</array>`))
  if (!block) return []
  return [...block[1].matchAll(/<string>([\s\S]*?)<\/string>/g)].map(part => part[1].trim())
}

/** `launchctl list` -> label -> { pid, lastExit }. */
async function readLaunchctl() {
  const map = new Map()
  try {
    const { stdout } = await execFileAsync('/bin/launchctl', ['list'], {
      timeout: 4000,
      maxBuffer: 8 * 1024 * 1024,
    })
    for (const line of stdout.split('\n')) {
      const parts = line.split('\t')
      if (parts.length < 3) continue
      const [pidText, exitText, label] = parts
      if (!label) continue
      const pid = pidText.trim() === '-' ? null : Number(pidText.trim())
      const lastExit = Number(exitText.trim())
      map.set(label.trim(), {
        pid: Number.isFinite(pid) ? pid : null,
        lastExit: Number.isFinite(lastExit) ? lastExit : null,
      })
    }
  } catch {
    // A missing launchctl must not blank the whole board; jobs still list with unknown state.
  }
  return map
}

async function statOrNull(path) {
  if (!path) return null
  try {
    return await stat(path)
  } catch {
    return null
  }
}

function shortenPath(value) {
  const home = homedir()
  return typeof value === 'string' && value.startsWith(home) ? `~${value.slice(home.length)}` : value
}

function titleOf(label) {
  return label.replace(/^(com\.user\.|com\.|net\.|org\.|io\.)/, '')
}

/**
 * The traffic light itself.
 *
 * ok    running, and (when the job reports on a schedule) its log is current
 * warn  running but silent for longer than its schedule implies, or idle-long
 * fail  stopped with a non-zero last exit, or declared KeepAlive without a process
 * idle  scheduled, never ran yet (or last run was clean and is simply waiting)
 */
function classify(task, now) {
  const intervalMs = task.interval ? task.interval * 1000 : null
  const staleAfter = intervalMs ? Math.max(intervalMs * 2.5, 15 * 60 * 1000) : 30 * 60 * 60 * 1000
  const logAge = typeof task.lastUpdate === 'number' ? now - task.lastUpdate : null
  const stale = logAge !== null && logAge > staleAfter

  if (task.running) {
    if (stale && !task.keepAlive) {
      return { state: 'warn', reason: 'running-but-quiet' }
    }
    return { state: 'ok', reason: 'running' }
  }
  if (typeof task.exitCode === 'number' && task.exitCode !== 0) {
    return { state: 'fail', reason: 'exited-nonzero' }
  }
  if (task.keepAlive) {
    return { state: 'fail', reason: 'keepalive-down' }
  }
  if (task.neverRan) {
    return { state: 'idle', reason: 'not-run-yet' }
  }
  return { state: stale ? 'warn' : 'ok', reason: stale ? 'stale-output' : 'waiting' }
}

async function collectOne(source, file, launchctl, now) {
  const plistPath = join(source.dir, file)
  const xml = await readFile(plistPath, 'utf8')
  const label = readString(xml, 'Label') || basename(file, '.plist')
  const live = launchctl.get(label) || { pid: null, lastExit: null }
  const parsed = xml

  const programArguments = readArray(parsed, 'ProgramArguments')
  const program = readString(parsed, 'Program') || programArguments[0] || null
  const args = programArguments.slice(1)
  const stdoutPath = readString(parsed, 'StandardOutPath') || null
  const stderrPath = readString(parsed, 'StandardErrorPath') || null
  const interval = readInteger(parsed, 'StartInterval') || null
  const keepAlive = readBoolean(parsed, 'KeepAlive') === true
  const runAtLoad = readBoolean(parsed, 'RunAtLoad') === true

  const [plistStat, outStat, errStat] = await Promise.all([
    statOrNull(plistPath),
    statOrNull(stdoutPath),
    statOrNull(stderrPath),
  ])

  const logCandidates = [outStat, errStat].filter(Boolean)
  const lastUpdate = logCandidates.length ? Math.max(...logCandidates.map(item => item.mtimeMs)) : null

  const task = {
    id: label,
    title: titleOf(label),
    scope: source.scope,
    plistPath: shortenPath(plistPath),
    program: program ? shortenPath(program) : null,
    args,
    stdoutPath: stdoutPath ? shortenPath(stdoutPath) : null,
    stderrPath: stderrPath ? shortenPath(stderrPath) : null,
    interval,
    keepAlive,
    runAtLoad,
    running: typeof live.pid === 'number' && live.pid > 0,
    pid: live.pid,
    exitCode: live.lastExit,
    neverRan: live.lastExit === null && live.pid === null,
    lastUpdate,
    createdAt: plistStat ? Math.round(plistStat.birthtimeMs || plistStat.ctimeMs) : null,
    updatedAt: plistStat ? Math.round(plistStat.mtimeMs) : null,
  }
  return { ...task, ...classify(task, now) }
}

/**
 * Reads the hand-edited notes file. Creates a template on first run so the
 * "what is this job?" column is one edit away instead of a blank wall.
 */
async function readNotes(tasks) {
  const display = shortenPath(NOTES_PATH)
  let raw = null
  try {
    raw = await readFile(NOTES_PATH, 'utf8')
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      return { notes: {}, meta: { path: display, error: 'unreadable' } }
    }
  }

  if (raw === null) {
    const template = {
      _help: '一句话说明每个任务在干什么。键是 launchd 标签，值是说明；保存后 15 秒内生效。',
      notes: Object.fromEntries(tasks.map(task => [task.id, ''])),
    }
    try {
      await mkdir(dirname(NOTES_PATH), { recursive: true })
      await writeFile(NOTES_PATH, `${JSON.stringify(template, null, 2)}\n`, 'utf8')
      return { notes: {}, meta: { path: display, created: true, filled: 0, total: tasks.length } }
    } catch {
      return { notes: {}, meta: { path: display, error: 'unwritable' } }
    }
  }

  try {
    const parsed = JSON.parse(raw)
    const notes = parsed && typeof parsed.notes === 'object' && parsed.notes ? parsed.notes : {}
    const filled = tasks.filter(task => {
      const value = notes[task.id]
      return typeof value === 'string' && value.trim().length > 0
    }).length
    return { notes, meta: { path: display, filled, total: tasks.length } }
  } catch {
    return { notes: {}, meta: { path: display, error: 'invalid-json' } }
  }
}

/**
 * Our own inferred lines: shipped defaults, optionally overridden by
 * `~/.config/dsh-ops-board/auto.json` (same shape as notes.json).
 */
async function readAuto() {
  const merged = { ...AUTO_DEFAULTS }
  try {
    const raw = await readFile(AUTO_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    const notes = parsed && typeof parsed.notes === 'object' && parsed.notes ? parsed.notes : parsed
    for (const [key, value] of Object.entries(notes || {})) {
      if (typeof value === 'string') merged[key] = value.trim()
    }
  } catch {
    // Missing or malformed overrides keep the shipped defaults.
  }
  return merged
}

async function collect() {
  const now = Date.now()
  const launchctl = await readLaunchctl()
  const auto = await readAuto()
  const tasks = []
  const seen = new Set()

  for (const source of SOURCES) {
    let files = []
    try {
      files = (await readdir(source.dir)).filter(file => file.endsWith('.plist'))
    } catch {
      continue
    }
    for (const file of files) {
      try {
        const task = await collectOne(source, file, launchctl, now)
        if (seen.has(task.id)) continue
        seen.add(task.id)
        tasks.push(task)
      } catch {
        // A malformed plist is one missing row, never a failed board.
      }
    }
  }

  const { notes, meta: notesMeta } = await readNotes(tasks)
  for (const task of tasks) {
    const value = notes[task.id]
    task.note = typeof value === 'string' && value.trim() ? value.trim() : null
    task.autoNote = typeof auto[task.id] === 'string' && auto[task.id].trim() ? auto[task.id] : null
  }

  const rank = { fail: 0, warn: 1, idle: 2, ok: 3 }
  tasks.sort((left, right) => {
    const delta = (rank[left.state] ?? 9) - (rank[right.state] ?? 9)
    return delta !== 0 ? delta : left.title.localeCompare(right.title)
  })

  const summary = { total: tasks.length, ok: 0, warn: 0, fail: 0, idle: 0 }
  for (const task of tasks) summary[task.state] = (summary[task.state] || 0) + 1

  return {
    generatedAt: new Date(now).toISOString(),
    host: hostname(),
    sources: SOURCES.map(source => shortenPath(source.dir)),
    summary,
    notes: notesMeta,
    tasks,
  }
}

let cache = { at: 0, value: null }

async function snapshot() {
  if (cache.value && Date.now() - cache.at < CACHE_MS) return cache.value
  const value = await collect()
  cache = { at: Date.now(), value }
  return value
}

export { collect }

export function apply(ctx) {
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'exact',
      path: STATE_PATH,
      handler: async (_req, res) => {
        try {
          const body = JSON.stringify(await snapshot())
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          })
          res.end(body)
        } catch (error) {
          res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: String(error && error.message ? error.message : error) }))
        }
      },
    }),
  )
}
