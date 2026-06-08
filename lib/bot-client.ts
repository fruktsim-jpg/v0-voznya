// Server-only thin client for the bot's internal API (separate VPS, docker net).
//
// The site reuses the bot's existing server logic instead of duplicating it in
// TS. Only the bot can actually send a Telegram Gift (it holds the token and
// Stars), so "withdraw" must ask the bot to deliver. Auth is a shared secret
// (BOT_INTERNAL_SECRET == bot's INTERNAL_API_SECRET); the bot listens on an
// internal address only. If env is missing, callers fall back gracefully.
import 'server-only'

export type DeliverGiftResult = {
  // completed — выдан сразу; pending — временная ошибка (повторит воркер);
  // cancelled — постоянная ошибка + возврат; not_found/not_pending/skip/error;
  // unreachable — бот недоступен (нет конфига или сеть) → решаем фолбэком.
  status:
    | 'completed'
    | 'pending'
    | 'cancelled'
    | 'not_found'
    | 'not_pending'
    | 'skip'
    | 'error'
    | 'unreachable'
    // «Подарить другу»: получатель не найден в Возне / нельзя себе.
    | 'recipient_not_found'
    | 'self_transfer'
  refunded?: boolean
  error?: string | null
}

/**
 * Просит бота попытаться выдать подарок СРАЗУ (P2: авто-выдача — основной путь).
 * Возвращает 'unreachable', если внутренний API не настроен/недоступен — тогда
 * вызывающий код деградирует на постановку в очередь (pending + воркер).
 *
 * ``recipient`` (опционально) — @username или Telegram ID друга: тогда РЕАЛЬНЫЙ
 * подарок уходит ему («Подарить другу»). Бот резолвит username по своей БД
 * (получатель должен быть в Возне). Без recipient — обычная выдача себе.
 */
export async function requestGiftDelivery(
  userId: number,
  deliveryKey: string,
  recipient?: string,
): Promise<DeliverGiftResult> {
  const base = process.env.BOT_INTERNAL_URL
  const secret = process.env.BOT_INTERNAL_SECRET
  if (!base || !secret) {
    return { status: 'unreachable', error: 'bot_internal_not_configured' }
  }

  try {
    // Короткий таймаут: выдача быстрая, а игрок ждёт ответ синхронно. Если бот
    // тормозит — не держим запрос, отдадим в очередь.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const payload: Record<string, unknown> = {
      user_id: userId,
      delivery_key: deliveryKey,
    }
    if (recipient && recipient.trim()) payload.recipient = recipient.trim()
    const res = await fetch(`${base.replace(/\/$/, '')}/internal/gifts/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(timer))

    const data = (await res.json().catch(() => ({}))) as DeliverGiftResult
    if (!data.status) return { status: 'unreachable', error: 'bad_response' }
    return data
  } catch (err) {
    // Сеть/таймаут/abort — деградируем в очередь, не падаем.
    return { status: 'unreachable', error: String(err) }
  }
}
