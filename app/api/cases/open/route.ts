import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { isDbConfigured, query } from '@/lib/db'
import { openCase } from '@/lib/cases-open'
import { ESHKI_PER_STAR, ITEM_SELL_RATE } from '@/lib/economy-rules'


export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/cases/open — открыть кейс игроком с сайта.
 *
 * Открытие выполняется НА СТОРОНЕ САЙТА, но против ОБЩЕЙ с ботом базы и в одной
 * транзакции (lib/cases-open.openCase — точный порт open_case бота: CSPRNG,
 * блокировки строк, списание ешек, инкремент лимитов, выдача награды,
 * pending-конвейер Telegram Gifts/Premium, леджер открытий). Так сделано потому,
 * что сайт (Vercel) не может достучаться до внутреннего API бота (отдельный VPS),
 * а БД у них общая. Бот остаётся местом ручной выдачи pending-гифтов.
 *
 * Кто открывает — берём из ПОДПИСАННОЙ сессии (session.uid), а НЕ из тела
 * запроса, иначе можно было бы открыть кейс за чужой счёт.
 *
 * Тело запроса: { caseItemCode: string }.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'cases_open_unavailable' }, { status: 503 })
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
    const r = await openCase(session.uid, caseItemCode)

    // HTTP-статус по бизнес-исходу — фронт различает причины без угадывания.
    const statusMap: Record<string, number> = {
      ok: 200,
      not_found: 404,
      inactive: 409,
      no_key: 409,
      not_enough: 402,
      empty: 409,
    }
    const httpStatus = statusMap[r.status] ?? 200

    // Для tg_gift считаем ЕДИНУЮ стоимость и сумму продажи (Release 2.2):
    // база = цена магазина price_eshki (фолбэк star_cost × курс). Тот же расчёт,
    // что в инвентаре и при продаже — фронт не должен пересчитывать сам.
    let starCost: number | null = null
    let value: number | null = null
    let sellAmount: number | null = null
    if (r.status === 'ok' && r.rewardKind === 'tg_gift' && r.rewardItemCode) {
      try {
        const rows = await query<{ star_cost: number | null; price_eshki: string | null }>(
          `SELECT star_cost, price_eshki::text AS price_eshki
             FROM gift_catalog WHERE code = $1`,
          [r.rewardItemCode],
        )
        starCost = rows[0]?.star_cost == null ? null : Number(rows[0].star_cost)
        const priceEshki = rows[0]?.price_eshki == null ? 0 : Number(rows[0].price_eshki)
        value = priceEshki > 0 ? priceEshki : (starCost ?? 0) * ESHKI_PER_STAR
        sellAmount = Math.floor(Math.max(0, value) * ITEM_SELL_RATE)
      } catch {
        starCost = null
        value = null
        sellAmount = null
      }
    }

    return NextResponse.json(
      {
        status: r.status,
        caseName: r.caseName ?? null,
        rewardKind: r.rewardKind ?? null,
        rewardItemCode: r.rewardItemCode ?? null,
        rewardItemName: r.rewardItemName ?? null,
        rewardRarity: r.rewardRarity ?? null,
        amount: r.amount ?? null,
        qty: r.qty ?? 1,
        isJackpot: Boolean(r.isJackpot),
        balance: r.balance ?? null,
        deliveryKey: r.deliveryKey ?? null,
        starCost,
        value,
        sellAmount,
      },
      { status: httpStatus },
    )

  } catch (err) {
    // Любая ошибка открытия → откат транзакции уже сделан в openCase.
    console.error('cases/open failed', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
