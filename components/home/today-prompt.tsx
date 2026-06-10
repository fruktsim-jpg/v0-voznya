import Link from 'next/link'
import type { HomeContext } from '@/lib/home-context'

/**
 * Today prompt (VOZNYA REDESIGN — Home Hub, zone 2).
 *
 * Explicitly answers "Why should I care today?". This is the motivation surface,
 * not an info card: it turns the real snapshot into one urgent reason to act
 * right now. Priority order picks the strongest honest hook available:
 *   1. a live chase (jackpot/limited featured case),
 *   2. close to the next division,
 *   3. an active streak to defend,
 *   4. community motion (recent events),
 *   5. neutral fallback.
 *
 * Every branch is DB-backed; nothing is invented. No fabricated "online now"
 * counts, no fake claimable rewards.
 */
type Prompt = { icon: string; headline: string; sub: string; cta: string; href: string }

function pickPrompt(ctx: HomeContext): Prompt {
  const id = ctx.identity

  if (ctx.featured?.hasChase) {
    return {
      icon: '🎯',
      headline: 'Сегодня есть за чем охотиться',
      sub: `В кейсе «${ctx.featured.name}» лежит редкая добыча. Шанс ограничен.`,
      cta: 'Испытать удачу',
      href: ctx.featured.href,
    }
  }

  if (id?.season?.nextDivision && id.season.toNext > 0 && id.season.ratio >= 0.5) {
    return {
      icon: id.season.nextDivision.emoji,
      headline: `${id.season.nextDivision.name} почти твой`,
      sub: `Осталось +${id.season.toNext.toLocaleString('ru-RU')} MMR до следующего дивизиона.`,
      cta: 'Открыть сезон',
      href: '/season',
    }
  }

  if (id && id.streak > 0) {
    return {
      icon: '🔥',
      headline: `Серия ${id.streak} дн — не разорви её`,
      sub: 'Вернись за наградой и удержи прогресс. Каждый день на счету.',
      cta: 'Продолжить',
      href: '/cases',
    }
  }

  if (ctx.communityFeed.length > 0) {
    return {
      icon: '⚡',
      headline: 'В Возне жарко прямо сейчас',
      sub: `${ctx.communityFeed.length}+ свежих событий: дропы, выигрыши и находки.`,
      cta: 'Влиться',
      href: '/cases',
    }
  }

  return {
    icon: '🎮',
    headline: 'Твой ход',
    sub: 'Открой кейс, подними MMR и поднимись в топе сообщества.',
    cta: 'Начать',
    href: '/cases',
  }
}

export function TodayPrompt({ ctx }: { ctx: HomeContext }) {
  const p = pickPrompt(ctx)
  return (
    <section className="px-4 pt-3 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={p.href}
          className="group flex items-center gap-4 rounded-2xl border border-[#8847FF]/35 p-4 transition hover:border-[#8847FF]/60 sm:p-5"
          style={{
            background:
              'linear-gradient(110deg, rgba(136,71,255,0.16), rgba(75,105,255,0.10) 60%, transparent)',
          }}
        >
          <span
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-2xl"
            aria-hidden
          >
            {p.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="label-eyebrow text-[#b79bff]">Почему стоит зайти сегодня</p>
            <p className="truncate font-bold text-foreground sm:text-lg">{p.headline}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{p.sub}</p>
          </div>
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-[#8847FF] px-4 py-2 text-sm font-semibold text-white transition group-hover:translate-x-0.5 sm:inline-flex">
            {p.cta}
            <span aria-hidden>→</span>
          </span>
        </Link>
      </div>
    </section>
  )
}
