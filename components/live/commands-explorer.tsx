'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { COMMAND_GROUPS } from '@/lib/voznya-bot'

export function CommandsExplorer() {
  const [q, setQ] = useState('')

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return COMMAND_GROUPS
    return COMMAND_GROUPS.map((g) => ({
      ...g,
      commands: g.commands.filter(
        (c) =>
          c.command.toLowerCase().includes(needle) ||
          c.description.toLowerCase().includes(needle) ||
          g.title.toLowerCase().includes(needle),
      ),
    })).filter((g) => g.commands.length > 0)
  }, [q])

  return (
    <section className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Команды</span>
        </h2>

        <div className="relative mx-auto mt-6 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск команды…"
            className="glass w-full rounded-full border border-border py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>

        {groups.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">Ничего не найдено</p>
        ) : (
          <div className="mt-8 space-y-6">
            {groups.map((g) => (
              <div key={g.title}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="text-base">{g.emoji}</span>
                  {g.title}
                </h3>
                <div className="mt-3 space-y-2">
                  {g.commands.map((c) => (
                    <div
                      key={c.command}
                      className="glass flex flex-col gap-0.5 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <code className="shrink-0 font-mono text-sm font-semibold text-primary">
                        {c.command}
                      </code>
                      <span className="text-xs text-muted-foreground sm:text-right sm:text-sm">
                        {c.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
