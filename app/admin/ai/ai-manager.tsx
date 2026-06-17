'use client'

import { useCallback, useState } from 'react'

/**
 * AI (Тёмный друн) admin manager. Owner-only client UI over the AI admin API:
 * provider/model settings, prompt editing, memory + history viewers, and a test
 * sandbox. All writes go through `/api/admin/ai/*` (audited, RBAC-gated).
 */
export type AiSettingRow = { key: string; value: unknown; updated_at: string }
export type AiPrompt = {
  name: string
  body: string
  description: string | null
  enabled: boolean
  updated_at: string
}

// Known settings keys with human labels + input hints.
const SETTING_FIELDS: {
  key: string
  label: string
  hint: string
  type: 'text' | 'password' | 'number' | 'bool'
}[] = [
  { key: 'enabled', label: 'Включён', hint: 'Друн говорит только когда включён', type: 'bool' },
  { key: 'base_url', label: 'Base URL', hint: 'https://api.openai.com/v1 · openrouter · anthropic', type: 'text' },
  { key: 'api_key', label: 'API ключ', hint: 'Хранится в БД, не показывается обратно', type: 'password' },
  { key: 'model', label: 'Модель', hint: 'gpt-4o-mini · claude-3-5-sonnet · ...', type: 'text' },
  { key: 'fast_model', label: 'Быстрая модель', hint: 'Дешёвая модель для служебных задач (память/события)', type: 'text' },
  { key: 'temperature', label: 'Temperature', hint: '0.0–2.0 (живость)', type: 'number' },
  { key: 'max_tokens', label: 'Max tokens', hint: 'Лимит длины ответа', type: 'number' },
  { key: 'posts_per_day_max', label: 'Постов в день', hint: 'Анти-спам для автономных постов', type: 'number' },
  { key: 'min_severity', label: 'Мин. severity', hint: 'Порог реакции на события (0–3)', type: 'number' },
  { key: 'autonomous_enabled', label: 'Сам пишет в чат', hint: 'Друн по своему почину комментирует события (off по умолч.)', type: 'bool' },
  { key: 'web_enabled', label: 'Веб-доступ', hint: 'Разрешить поиск в интернете (нужен web_search_url)', type: 'bool' },
  { key: 'web_search_url', label: 'URL поиска', hint: 'SearXNG-совместимый JSON endpoint (?q=&format=json)', type: 'text' },
  { key: 'web_daily_cap', label: 'Веб-запросов/сутки', hint: 'Дневной кап на поиск', type: 'number' },
  { key: 'image_enabled', label: 'Генерация картинок', hint: 'Разрешить рисовать (нужны endpoint/модель)', type: 'bool' },
  { key: 'image_base_url', label: 'URL картинок', hint: 'OpenAI images-совместимый (/images/generations)', type: 'text' },
  { key: 'image_api_key', label: 'Ключ картинок', hint: 'Пусто → берётся основной API ключ', type: 'password' },
  { key: 'image_model', label: 'Модель картинок', hint: 'gpt-image-1 · dall-e-3 · ...', type: 'text' },
  { key: 'image_daily_cap', label: 'Картинок/сутки', hint: 'Дневной кап на генерацию', type: 'number' },
]

const card = 'glass rounded-2xl border border-border p-5'

// Мульти-модельность: роли друна (совпадают с app.features.drun.config.ALL_ROLES).
// ВНИМАНИЕ: дублирует bot/app/features/drun/config.py (ALL_ROLES). При изменении
// ролей правь ОБА места — рассинхрон ломает «Пресет» в админке.
const AI_ROLES: { key: string; label: string; hint: string }[] = [
  { key: 'narrator', label: 'Голос (narrator)', hint: 'Ответы, реакции, истории — самая сильная модель' },
  { key: 'memory_extract', label: 'Извлечение памяти', hint: 'Вытаскивает факты из чата — дёшево, много вызовов' },
  { key: 'memory_summary', label: 'Сжатие памяти', hint: 'Портреты игроков, компактная модель' },
  { key: 'event_analysis', label: 'Анализ событий', hint: 'Разбор событий мира' },
  { key: 'planning', label: 'Планирование', hint: 'Парсинг owner-команд в JSON — точная модель' },
  { key: 'vision', label: 'Зрение (vision)', hint: 'Понимание картинок — мультимодальная модель' },
  { key: 'moderation', label: 'Модерация', hint: 'Взвешенные модерационные решения' },
]

// Рекомендованный пресет (зеркало DEFAULT_ROLE_MODELS в боте). Кнопка «пресет».
// ВНИМАНИЕ: дублирует bot/app/features/drun/config.py (DEFAULT_ROLE_MODELS).
// Держи в синхроне — иначе «Пресет» запишет в models_by_role устаревшие имена
// моделей, которых может не быть на endpoint.
const RECOMMENDED_ROLE_MODELS: Record<string, string> = {
  narrator: 'claude-opus-4-8',
  memory_extract: 'gpt-5.4-mini',
  memory_summary: 'claude-haiku-4-5',
  event_analysis: 'gpt-5.4-mini',
  planning: 'gpt-5.4',
  vision: 'gpt-5.5',
  moderation: 'claude-sonnet-4-6',
}

const input =
  'w-full rounded-lg border border-border bg-white/[0.04] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50'
const btn =
  'rounded-lg border border-primary/30 bg-primary/[0.08] px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/[0.16] disabled:opacity-50'

function valueToString(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

export function AiManager({
  initialSettings,
  initialPrompts,
}: {
  initialSettings: AiSettingRow[]
  initialPrompts: AiPrompt[]
}) {
  const initialMap: Record<string, string> = {}
  for (const s of initialSettings) initialMap[s.key] = valueToString(s.value)
  const [values, setValues] = useState<Record<string, string>>(initialMap)
  const [saving, setSaving] = useState<string | null>(null)
  const [notice, setNotice] = useState<string>('')

  const saveSetting = useCallback(
    async (key: string, raw: string, type: string) => {
      setSaving(key)
      setNotice('')
      let value: unknown = raw
      if (type === 'bool') value = raw === 'true'
      else if (type === 'number') value = Number(raw)
      try {
        const res = await fetch('/api/admin/ai/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
        const data = await res.json()
        setNotice(res.ok ? `Сохранено: ${key}` : `Ошибка: ${data.error ?? res.status}`)
      } catch (err) {
        setNotice(`Ошибка сети: ${String(err)}`)
      } finally {
        setSaving(null)
      }
    },
    [],
  )

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className="rounded-lg border border-primary/30 bg-primary/[0.06] px-4 py-2 text-sm text-foreground">
          {notice}
        </div>
      )}
      <ProviderCard
        values={values}
        setValues={setValues}
        saving={saving}
        onSave={saveSetting}
      />
      <RolesCard initialSettings={initialSettings} setNotice={setNotice} />
      <PromptsCard initialPrompts={initialPrompts} setNotice={setNotice} />
      <TestCard setNotice={setNotice} />
      <ViewersCard />
    </div>
  )
}

function ProviderCard({
  values,
  setValues,
  saving,
  onSave,
}: {
  values: Record<string, string>
  setValues: (fn: (p: Record<string, string>) => Record<string, string>) => void
  saving: string | null
  onSave: (key: string, raw: string, type: string) => void
}) {
  return (
    <div className={card}>
      <h2 className="mb-1 text-base font-bold text-foreground">Провайдер и модель</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        OpenAI-совместимый endpoint. Для Claude укажи base_url с «anthropic».
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {SETTING_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{f.label}</label>
            {f.type === 'bool' ? (
              <select
                className={input}
                value={values[f.key] ?? 'false'}
                onChange={(e) =>
                  setValues((p) => ({ ...p, [f.key]: e.target.value }))
                }
              >
                <option value="true">Включён</option>
                <option value="false">Выключен</option>
              </select>
            ) : (
              <input
                className={input}
                type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                value={values[f.key] ?? ''}
                placeholder={f.hint}
                onChange={(e) =>
                  setValues((p) => ({ ...p, [f.key]: e.target.value }))
                }
              />
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground/70">{f.hint}</span>
              <button
                className={btn}
                disabled={saving === f.key}
                onClick={() => onSave(f.key, values[f.key] ?? '', f.type)}
              >
                {saving === f.key ? '…' : 'Сохранить'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RolesCard({
  initialSettings,
  setNotice,
}: {
  initialSettings: AiSettingRow[]
  setNotice: (s: string) => void
}) {
  // Текущая раскладка ролей из настройки models_by_role (JSON объект).
  const initialRoles: Record<string, string> = {}
  const raw = initialSettings.find((s) => s.key === 'models_by_role')?.value
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      initialRoles[k] = String(v ?? '')
    }
  }
  const [roles, setRoles] = useState<Record<string, string>>(initialRoles)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    setNotice('')
    // Пустые значения не пишем — роль уйдёт на основную/быструю модель в боте.
    const cleaned: Record<string, string> = {}
    for (const [k, v] of Object.entries(roles)) {
      const t = v.trim()
      if (t) cleaned[k] = t
    }
    try {
      const res = await fetch('/api/admin/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'models_by_role', value: cleaned }),
      })
      const data = await res.json()
      setNotice(res.ok ? 'Сохранена раскладка ролей' : `Ошибка: ${data.error ?? res.status}`)
    } catch (err) {
      setNotice(`Ошибка сети: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={card}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">Модели по ролям</h2>
        <button
          className={btn}
          type="button"
          onClick={() => setRoles({ ...RECOMMENDED_ROLE_MODELS })}
        >
          Пресет
        </button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Каждой задаче — своя модель. Пусто → роль идёт на основную (или быструю
        для служебных). Имена моделей должны существовать на твоём endpoint.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {AI_ROLES.map((r) => (
          <div key={r.key} className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">{r.label}</label>
            <input
              className={input}
              type="text"
              value={roles[r.key] ?? ''}
              placeholder={RECOMMENDED_ROLE_MODELS[r.key] ?? 'модель'}
              onChange={(e) =>
                setRoles((p) => ({ ...p, [r.key]: e.target.value }))
              }
            />
            <span className="text-[11px] text-muted-foreground/70">{r.hint}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button className={btn} disabled={saving} onClick={save}>
          {saving ? '…' : 'Сохранить раскладку'}
        </button>
      </div>
    </div>
  )
}

const KNOWN_PROMPTS = ['persona', 'world', 'observation', 'reaction', 'reply']

function PromptsCard({
  initialPrompts,
  setNotice,
}: {
  initialPrompts: AiPrompt[]
  setNotice: (s: string) => void
}) {
  const byName: Record<string, AiPrompt> = {}
  for (const p of initialPrompts) byName[p.name] = p
  const [name, setName] = useState<string>(initialPrompts[0]?.name ?? 'persona')
  const [body, setBody] = useState<string>(initialPrompts[0]?.body ?? '')
  const [saving, setSaving] = useState(false)

  const pick = (n: string) => {
    setName(n)
    setBody(byName[n]?.body ?? '')
  }

  const save = async () => {
    setSaving(true)
    setNotice('')
    try {
      const res = await fetch('/api/admin/ai/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, body, enabled: true }),
      })
      const data = await res.json()
      setNotice(res.ok ? `Промпт сохранён: ${name}` : `Ошибка: ${data.error ?? res.status}`)
    } catch (err) {
      setNotice(`Ошибка сети: ${String(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const options = Array.from(new Set([...KNOWN_PROMPTS, ...Object.keys(byName)]))

  return (
    <div className={card}>
      <h2 className="mb-1 text-base font-bold text-foreground">Промпты</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        persona — голос (ПЕРСОНАЖ.txt) · world — лор (МИР.txt) · observation /
        reaction — задания. Пусто = бот берёт файл лора или дефолт.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => pick(n)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              n === name
                ? 'border-primary/50 bg-primary/[0.14] text-foreground'
                : 'border-border bg-white/[0.04] text-muted-foreground hover:bg-primary/[0.08]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        className={`${input} min-h-[180px] font-mono text-xs`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Текст промпта…"
      />
      <div className="mt-3">
        <button className={btn} disabled={saving} onClick={save}>
          {saving ? 'Сохраняю…' : 'Сохранить промпт'}
        </button>
      </div>
    </div>
  )
}

function TestCard({ setNotice }: { setNotice: (s: string) => void }) {
  const [task, setTask] = useState(
    'Оглядись и брось одно живое наблюдение про мир Возни.',
  )
  const [subject, setSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')

  const run = async () => {
    setLoading(true)
    setAnswer('')
    setNotice('')
    try {
      const res = await fetch('/api/admin/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          subjectId: subject.trim() ? Number(subject.trim()) : null,
        }),
      })
      const data = await res.json()
      if (data.ok) setAnswer(data.text)
      else setNotice(`Друн промолчал: ${data.error ?? res.status}`)
    } catch (err) {
      setNotice(`Ошибка сети: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={card}>
      <h2 className="mb-1 text-base font-bold text-foreground">Тестовый запрос</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Песочница: реплика генерируется текущей конфигурацией с живым контекстом,
        но НЕ постится в чат. Требует настроенного внутреннего API бота.
      </p>
      <textarea
        className={`${input} min-h-[80px] text-sm`}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Задание для друна…"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className={`${input} max-w-[200px]`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="ID игрока (необязательно)"
        />
        <button className={btn} disabled={loading} onClick={run}>
          {loading ? 'Думает…' : 'Спросить друна'}
        </button>
      </div>
      {answer && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.05] p-4 text-sm text-foreground whitespace-pre-wrap">
          {answer}
        </div>
      )}
    </div>
  )
}

type MemoryRow = {
  id: string
  subject_id: string | null
  kind: string
  fact: string
  weight: number
  created_at: string
}
type HistoryRow = {
  id: string
  channel: string
  role: string
  content: string
  created_at: string
}

function ViewersCard() {
  const [tab, setTab] = useState<'memory' | 'history'>('history')
  const [memory, setMemory] = useState<MemoryRow[] | null>(null)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (which: 'memory' | 'history') => {
    setTab(which)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ai/${which}`, { cache: 'no-store' })
      const data = await res.json()
      if (which === 'memory') setMemory(data.memories ?? [])
      else setHistory(data.messages ?? [])
    } catch {
      if (which === 'memory') setMemory([])
      else setHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className={card}>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="mr-2 text-base font-bold text-foreground">Память и история</h2>
        <button
          onClick={() => load('history')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${tab === 'history' ? 'border-primary/50 bg-primary/[0.14]' : 'border-border bg-white/[0.04] text-muted-foreground'}`}
        >
          История ответов
        </button>
        <button
          onClick={() => load('memory')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${tab === 'memory' ? 'border-primary/50 bg-primary/[0.14]' : 'border-border bg-white/[0.04] text-muted-foreground'}`}
        >
          Долгосрочная память
        </button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
      {!loading && tab === 'history' && (
        <div className="flex flex-col gap-2">
          {history === null && (
            <p className="text-sm text-muted-foreground">Нажми «История ответов».</p>
          )}
          {history?.length === 0 && (
            <p className="text-sm text-muted-foreground">Пока пусто.</p>
          )}
          {history?.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-white/[0.03] p-3 text-sm">
              <div className="mb-1 text-[11px] text-muted-foreground">
                {m.role} · {m.channel} · {new Date(m.created_at).toLocaleString()}
              </div>
              <div className="text-foreground whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        </div>
      )}
      {!loading && tab === 'memory' && (
        <div className="flex flex-col gap-2">
          {memory === null && (
            <p className="text-sm text-muted-foreground">Нажми «Долгосрочная память».</p>
          )}
          {memory?.length === 0 && (
            <p className="text-sm text-muted-foreground">Фактов пока нет.</p>
          )}
          {memory?.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-white/[0.03] p-3 text-sm">
              <div className="mb-1 text-[11px] text-muted-foreground">
                {m.kind} · вес {m.weight}
                {m.subject_id ? ` · игрок ${m.subject_id}` : ' · про мир'}
              </div>
              <div className="text-foreground">{m.fact}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
