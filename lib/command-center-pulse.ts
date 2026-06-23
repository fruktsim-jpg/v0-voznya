import 'server-only'

import { loadEconomyOverview, loadDailyFlow, loadFlowBySource, loadCaseLiveStats, loadGiftsOverview } from './economy-analytics'
import { buildCasesHealth } from './admin/case-health'
import { query } from './db'

/**
 * COMMAND CENTER PULSE — the cross-system attention layer.
 *
 * Answers ONE question the moment the operator opens `/admin`: "what needs my
 * attention right now?" — as FINDINGS (interpretation), not metrics/charts.
 *
 * Architecture is PLUGGABLE: each system is a `PulseProvider` (async () =>
 * PulseSignal[]). Future systems (Casino, Referrals, Deposits, LiveOps,
 * Moderation, Investigation) add a provider to PROVIDERS — no special-casing,
 * no schema change. Providers are read-only and must self-degrade to [] on any
 * error so the pulse never 500s. This is also the seed for future alerting.
 */

export type PulseSeverity = 'critical' | 'warning' | 'good' | 'info'

export type PulseAction = {
  /** button label, e.g. "Открыть экономику" */
  label: string
  /** where it goes (deep link today; one-click ops can come later) */
  href: string
  /** primary = filled accent; secondary = outline */
  kind?: 'primary' | 'secondary'
}

export type PulseSignal = {
  /** system this came from, e.g. 'economy' | 'cases' | 'gifts' | 'season' */
  system: string
  severity: PulseSeverity
  /** short finding, e.g. "Инфляция: масса растёт" */
  title: string
  /** one-line interpretation/reason */
  detail: string
  /** optional deep link into the relevant module (row click) */
  href?: string
  /**
   * Action-first: concrete next steps for this finding. A finding is not just a
   * link — it offers what to DO. Today these are deep links to the right screen;
   * the contract allows real one-click ops later without changing callers.
   */
  actions?: PulseAction[]
}

const SEVERITY_RANK: Record<PulseSeverity, number> = { critical: 0, warning: 1, good: 2, info: 3 }

type PulseProvider = () => Promise<PulseSignal[]>

// --- Providers (one per system; add new systems here only) ------------------

const economyPulse: PulseProvider = async () => {
  try {
    const [overview, daily] = await Promise.all([loadEconomyOverview(), loadDailyFlow(14)])
    const supply = overview.totalEshki ?? 0
    const net14 = daily.reduce((s, d) => s + d.net, 0)
    const last7 = daily.slice(-7).reduce((s, d) => s + d.net, 0)
    const prev7 = daily.slice(-14, -7).reduce((s, d) => s + d.net, 0)
    const pressure = supply > 0 ? net14 / supply : 0
    const out: PulseSignal[] = []
    if (pressure >= 0.1) {
      out.push({
        system: 'economy',
        severity: 'critical',
        title: 'Сильная инфляция',
        detail: `Денежная масса выросла на ${Math.round(pressure * 100)}% за 14 дней.`,
        href: '/admin/economy',
        actions: [
          { label: 'Открыть экономику', href: '/admin/economy', kind: 'primary' },
          { label: 'Источники потока', href: '/admin/economy#flow' },
          { label: 'Модификаторы', href: '/admin/operations' },
        ],
      })
    } else if (pressure >= 0.05) {
      out.push({
        system: 'economy',
        severity: 'warning',
        title: 'Инфляционное давление',
        detail: `Масса растёт (${Math.round(pressure * 100)}% / 14д). Следи за источниками.`,
        href: '/admin/economy',
        actions: [
          { label: 'Открыть экономику', href: '/admin/economy', kind: 'primary' },
          { label: 'Источники потока', href: '/admin/economy#flow' },
        ],
      })
    } else if (pressure <= -0.05) {
      out.push({
        system: 'economy',
        severity: 'info',
        title: 'Дефляция',
        detail: `Масса сжимается (${Math.round(pressure * 100)}% / 14д).`,
        href: '/admin/economy',
      })
    } else {
      out.push({ system: 'economy', severity: 'good', title: 'Экономика стабильна', detail: 'Денежная масса в норме.', href: '/admin/economy' })
    }
    if (Math.abs(last7) > Math.abs(prev7) * 2 && Math.abs(prev7) > 0) {
      out.push({
        system: 'economy',
        severity: 'warning',
        title: 'Резкий сдвиг потока',
        detail: `Поток за 7д (${last7 >= 0 ? '+' : ''}${Math.round(last7)}) вдвое отличается от предыдущих 7д.`,
        href: '/admin/economy',
      })
    }
    return out
  } catch {
    return []
  }
}

const casesPulse: PulseProvider = async () => {
  try {
    const [named, stats] = await Promise.all([
      query<{ item_code: string; name: string }>(
        `SELECT item_code, name FROM case_definitions WHERE is_active = true`,
      ).catch(() => [] as { item_code: string; name: string }[]),
      loadCaseLiveStats(),
    ])
    if (named.length === 0) return []
    const report = buildCasesHealth(named, stats)
    const out: PulseSignal[] = []
    const generous = report.attention.filter((c) => c.verdict === 'too_generous')
    const lowEng = report.attention.filter((c) => c.verdict === 'low_engagement')
    if (generous.length > 0) {
      out.push({
        system: 'cases',
        severity: 'warning',
        title: `${generous.length} кейс(ов) слишком щедрые`,
        detail: `${generous.map((c) => c.name).slice(0, 3).join(', ')} отдают больше, чем берут.`,
        href: '/admin/cases',
        actions: [{ label: 'Настроить кейсы', href: '/admin/cases', kind: 'primary' }],
      })
    }
    if (lowEng.length > 0) {
      out.push({
        system: 'cases',
        severity: 'info',
        title: `${lowEng.length} кейс(ов) почти не открывают`,
        detail: `${lowEng.map((c) => c.name).slice(0, 3).join(', ')} — низкая вовлечённость.`,
        href: '/admin/cases',
      })
    }
    if (report.totals.needsAttention === 0 && report.totals.openingsTotal > 0) {
      out.push({ system: 'cases', severity: 'good', title: 'Кейсы здоровы', detail: 'Ни один кейс не требует вмешательства.', href: '/admin/cases' })
    }
    return out
  } catch {
    return []
  }
}

const giftsPulse: PulseProvider = async () => {
  try {
    const g = await loadGiftsOverview()
    const out: PulseSignal[] = []
    if (g.pending > 0) {
      out.push({
        system: 'gifts',
        severity: g.pending >= 10 ? 'warning' : 'info',
        title: `${g.pending} подарков в очереди`,
        detail: 'Ожидают доставки в Telegram.',
        href: '/admin/gifts/deliveries',
        actions: [{ label: 'Открыть очередь', href: '/admin/gifts/deliveries', kind: 'primary' }],
      })
    }
    if (g.cancelled > 0) {
      out.push({
        system: 'gifts',
        severity: 'warning',
        title: `${g.cancelled} отменённых доставок`,
        detail: 'Возможны возвраты/жалобы — проверь очередь.',
        href: '/admin/gifts/deliveries',
        actions: [{ label: 'Проверить очередь', href: '/admin/gifts/deliveries', kind: 'primary' }],
      })
    }
    return out
  } catch {
    return []
  }
}

const seasonPulse: PulseProvider = async () => {
  try {
    const rows = await query<{ name: string; ends_at: string | null; is_active: boolean }>(
      `SELECT name, ends_at, is_active FROM seasons WHERE is_active = true ORDER BY started_at DESC LIMIT 1`,
    )
    const s = rows[0]
    if (!s) return []
    if (s.ends_at) {
      const days = Math.ceil((new Date(s.ends_at).getTime() - Date.now()) / 86_400_000)
      if (days <= 0) {
        return [{ system: 'season', severity: 'warning', title: 'Сезон завершился', detail: `«${s.name}» пора финализировать.`, href: '/admin/season', actions: [{ label: 'Финализировать сезон', href: '/admin/season', kind: 'primary' }] }]
      }
      if (days <= 3) {
        return [{ system: 'season', severity: 'info', title: `Сезон заканчивается через ${days} дн.`, detail: `«${s.name}» скоро финал — подготовь награды.`, href: '/admin/season', actions: [{ label: 'Открыть сезон', href: '/admin/season' }] }]
      }
    }
    return [{ system: 'season', severity: 'good', title: 'Сезон идёт', detail: `«${s.name}» активен.`, href: '/admin/season' }]
  } catch {
    return []
  }
}

const drunPulse: PulseProvider = async () => {
  try {
    const [settingsRows, feedRows, proposalRows, activeEventsRows, worldviewRows] = await Promise.all([
      query<{ key: string; value: unknown }>(
        `SELECT key, value
           FROM ai_settings
          WHERE key IN ('enabled', 'api_key', 'autonomous_enabled', 'econ_enabled')`,
      ).catch(() => [] as { key: string; value: unknown }[]),
      query<{ created_at: string }>(
        `SELECT created_at
           FROM ai_messages
          WHERE channel = 'web'
            AND role = 'assistant'
          ORDER BY created_at DESC
          LIMIT 1`,
      ).catch(() => [] as { created_at: string }[]),
      query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM drun_proposals
          WHERE status = 'pending'`,
      ).catch(() => [] as { count: string }[]),
      query<{ count: string }>(
        `SELECT count(*)::text AS count
           FROM drun_events
          WHERE status = 'active'`,
      ).catch(() => [] as { count: string }[]),
      query<{ updated_at: string }>(
        `SELECT updated_at
           FROM ai_memories
          WHERE kind IN ('storyline', 'prediction', 'legend')
          ORDER BY updated_at DESC
          LIMIT 1`,
      ).catch(() => [] as { updated_at: string }[]),
    ])

    const settings = new Map(settingsRows.map((r) => [r.key, r.value]))
    const enabled = settings.get('enabled') === true
    const apiKey = String(settings.get('api_key') ?? '').trim()
    const autonomous = settings.get('autonomous_enabled') === true
    const econ = settings.get('econ_enabled') === true
    const pending = Number(proposalRows[0]?.count ?? 0)
    const activeEvents = Number(activeEventsRows[0]?.count ?? 0)
    const latestFeed = feedRows[0]?.created_at ? new Date(feedRows[0].created_at).getTime() : 0
    const latestWorldview = worldviewRows[0]?.updated_at ? new Date(worldviewRows[0].updated_at).getTime() : 0
    const feedQuietHours = latestFeed ? (Date.now() - latestFeed) / 3_600_000 : Infinity
    const worldviewStaleHours = latestWorldview ? (Date.now() - latestWorldview) / 3_600_000 : Infinity
    const out: PulseSignal[] = []

    if (!enabled || !apiKey) {
      out.push({
        system: 'drun',
        severity: 'warning',
        title: 'Друн выключен или без ключа',
        detail: 'AI-персона не сможет говорить, помнить и наполнять web-ленту.',
        href: '/admin/ai',
        actions: [{ label: 'Открыть Друна', href: '/admin/ai', kind: 'primary' }],
      })
    } else if (!autonomous) {
      out.push({
        system: 'drun',
        severity: 'warning',
        title: 'Автономность Друна выключена',
        detail: 'Он отвечает на обращения, но редко сам оживляет чат и web-ленту.',
        href: '/admin/ai',
        actions: [{ label: 'Включить в админке', href: '/admin/ai', kind: 'primary' }],
      })
    } else if (feedQuietHours > 24) {
      out.push({
        system: 'drun',
        severity: 'info',
        title: 'Друн давно не говорил в web',
        detail: latestFeed ? `Последняя web-реплика была ${Math.round(feedQuietHours)} ч назад.` : 'В web-ленте ещё нет реплик.',
        href: '/drun',
        actions: [{ label: 'Открыть ленту', href: '/drun' }],
      })
    } else {
      out.push({
        system: 'drun',
        severity: 'good',
        title: 'Друн на связи',
        detail: `Web-голос живой; активных ивентов: ${activeEvents}.`,
        href: '/drun',
      })
    }

    if (pending > 0) {
      out.push({
        system: 'drun',
        severity: 'warning',
        title: `${pending} предложений Друна ждут решения`,
        detail: 'Approval queue накопилась: ивенты или действия не исполнятся без владельца.',
        href: '/admin/ai',
        actions: [{ label: 'Разобрать очередь', href: '/admin/ai', kind: 'primary' }],
      })
    }

    if (enabled && apiKey && worldviewStaleHours > 12) {
      out.push({
        system: 'drun',
        severity: 'info',
        title: 'Летопись Друна давно не обновлялась',
        detail: latestWorldview ? `Последний worldview след был ${Math.round(worldviewStaleHours)} ч назад.` : 'Пока нет storyline/prediction/legend памяти.',
        href: '/drun',
      })
    }

    if (econ) {
      out.push({
        system: 'drun',
        severity: 'info',
        title: 'Экономическая власть Друна включена',
        detail: 'Tax/grant остаются capped и audited, но это высокий blast-radius режим.',
        href: '/admin/ai',
      })
    }

    return out
  } catch {
    return []
  }
}

// The registry. Future systems (casino, referrals, deposits, liveops,
// moderation, investigation) plug in here with the same contract.
const PROVIDERS: PulseProvider[] = [economyPulse, casesPulse, giftsPulse, seasonPulse, drunPulse]

export type PulseReport = {
  signals: PulseSignal[]
  attention: PulseSignal[] // critical + warning, ranked
  counts: { critical: number; warning: number; good: number; info: number }
  allClear: boolean
}

/** Run every provider in parallel and aggregate into a ranked attention report. */
export async function loadPulse(): Promise<PulseReport> {
  const results = await Promise.all(PROVIDERS.map((p) => p()))
  const signals = results.flat().sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  const attention = signals.filter((s) => s.severity === 'critical' || s.severity === 'warning')
  const counts = {
    critical: signals.filter((s) => s.severity === 'critical').length,
    warning: signals.filter((s) => s.severity === 'warning').length,
    good: signals.filter((s) => s.severity === 'good').length,
    info: signals.filter((s) => s.severity === 'info').length,
  }
  return { signals, attention, counts, allClear: attention.length === 0 }
}
