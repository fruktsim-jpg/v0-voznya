'use server'

import { revalidatePath } from 'next/cache'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import {
  startSeason,
  finalizeActiveSeason,
  getActiveSeason,
  type FinalizeWinner,
} from '@/lib/season'

/**
 * Server actions для управления сезоном из админки. Используют права MMR_ADD
 * (сезон — часть MMR-домена прогрессии). Каждое действие пишет аудит.
 */

export type SeasonActionResult =
  | { ok: true; message: string; winners?: FinalizeWinner[] }
  | { ok: false; error: string }

export async function startSeasonAction(
  name: string,
): Promise<SeasonActionResult> {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: 'Не авторизован' }
  if (!hasPermission(session.role, PERM.MMR_ADD)) {
    return { ok: false, error: 'Недостаточно прав' }
  }

  const active = await getActiveSeason()
  if (active) {
    return {
      ok: false,
      error: `Уже идёт сезон «${active.name}». Сначала заверши его.`,
    }
  }

  const cleanName = name.trim() || 'Сезон 1'
  const seasonId = await startSeason(cleanName)

  await writeAudit({
    actorUserId: session.uid,
    actorRole: session.role,
    action: 'season.start',
    targetType: 'season',
    targetId: String(seasonId),
    reason: cleanName,
  })


  revalidatePath('/admin/season')
  return { ok: true, message: `Сезон «${cleanName}» (#${seasonId}) запущен.` }
}

export async function finalizeSeasonAction(): Promise<SeasonActionResult> {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: 'Не авторизован' }
  if (!hasPermission(session.role, PERM.MMR_ADD)) {
    return { ok: false, error: 'Недостаточно прав' }
  }

  const active = await getActiveSeason()
  if (!active) {
    return { ok: false, error: 'Активного сезона нет.' }
  }

  const winners = await finalizeActiveSeason()

  await writeAudit({
    actorUserId: session.uid,
    actorRole: session.role,
    action: 'season.finalize',
    targetType: 'season',
    targetId: String(active.id),
    reason: `winners=${winners.length}`,
    meta: { winners: winners.length },
  })


  revalidatePath('/admin/season')
  return {
    ok: true,
    message: `Сезон «${active.name}» завершён. Награждено: ${winners.length}.`,
    winners,
  }
}
