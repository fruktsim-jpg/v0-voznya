import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/cases/open — открыть кейс игроком с сайта.
 *
 * Сайт НЕ открывает кейс сам и НЕ дублирует экономику: вся выдача (CSPRNG,
 * блокировки строк, списание ешек, инкремент лимитов, выдача награды и
 * pending-конвейер Telegram Gifts/Premium, леджер открытий) живёт в боте в
 * единственной функции open_case. Этот роут — тонкий мост:
 *
 *   1) проверяет ПОДПИСАННУЮ player-сессию (кто открывает — берём из неё,
 *      а НЕ из тела запроса; иначе можно было бы открыть кейс за чужой счёт);
 *   2) проксирует запрос во внутренний API бота (общий секрет, docker-сеть);
 *   3) возвращает результат фронту для анимации и показа награды.
 *
 * Тело запроса: { caseItemCode: string }. user_id берём из сессии.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const botUrl = process.env.BOT_INTERNAL_URL
  const secret = process.env.BOT_INTERNAL_SECRET
  if (!botUrl || !secret) {
    // Мост не сконфигурирован — открытие через сайт недоступно (но витрина
    // продолжает работать). Явная 503, чтобы фронт показал понятную ошибку.
    return NextResponse.json(
      { error: 'cases_open_unavailable' },
      { status: 503 },
    )
  }

  let body: { caseItemCode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const caseItemCode = (body.caseItemCode ?? '').toString().trim()
  if (!caseItemCode || caseItemCode.length > 64) {
    return NextResponse.json({ error: 'invalid_case' }, { status: 400 })
  }

  try {
    const res = await fetch(`${botUrl.replace(/\/$/, '')}/internal/cases/open`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify({
        user_id: session.uid,
        case_item_code: caseItemCode,
      }),
      // Внутренний вызов в docker-сети — короткий таймаут не нужен, но не висим.
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => ({}))
    // Прокидываем статус бота как есть (200/402/404/409/...), чтобы фронт мог
    // различать «не хватает ешек» и «кейс выключен» без угадывания.
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'bot_unreachable' }, { status: 502 })
  }
}
