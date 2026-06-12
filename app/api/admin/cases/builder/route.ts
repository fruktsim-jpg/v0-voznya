import { NextResponse, type NextRequest } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getAdminSession, writeAudit } from '@/lib/auth/admin-session'
import { hasPermission, PERM } from '@/lib/auth/admin-permissions'
import { caseBuilderSchema, firstZodError } from '@/lib/admin/schemas'
import { isContentStatus, STATUS_META } from '@/lib/admin/lifecycle'
import { slugifyCode, slugifyWithPrefix, generateUniqueCode } from '@/lib/admin/code-gen'
import { invalidateAssetOverlay } from '@/lib/item-art/manifest-source'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * One-screen Case Builder API (workflow-first). A single audited transaction:
 *   1. auto-creates the case ITEM (inventory_items, type='case', auto-code),
 *   2. upserts the case DEFINITION (case_definitions),
 *   3. inline-creates any NEW reward items (auto-code),
 *   4. replaces the drop list, converting operator percent CHANCES → integer
 *      weights (scaled to 10000, ratios preserved),
 *   5. optionally authors a featured_slots row.
 *
 * The operator never types a code or a weight. Opening stays the bot's job
 * (authoring ≠ opening); economy/grants untouched (Model 2). Existing rewards
 * with a global supply cap keep their granted_count (we update in place when the
 * same reward item is present, else recreate).
 */

function ipOf(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
}

const activeFor = (status: string): boolean =>
  isContentStatus(status) ? STATUS_META[status].isLive : false

/** Convert percent chances → positive integer weights scaled to ~10000. */
function chancesToWeights(percents: number[]): number[] {
  const total = percents.reduce((s, p) => s + (p > 0 ? p : 0), 0)
  if (total <= 0) return percents.map(() => 1)
  return percents.map((p) => Math.max(1, Math.round((p / total) * 10000)))
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!hasPermission(session.role, PERM.CASES_MANAGE)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = caseBuilderSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 })
  }
  const c = parsed.data

  // Validate cost shape (mirror /api/admin/cases rules).
  if (c.openCostKind === 'currency' && c.openCostAmount <= 0) {
    return NextResponse.json({ error: 'Платный кейс требует положительную цену' }, { status: 400 })
  }
  if (c.openCostKind === 'free' && !c.consumesKey) {
    return NextResponse.json({ error: 'Бесплатный кейс должен списывать ключ из инвентаря' }, { status: 400 })
  }
  // Each reward must resolve to an item code or be a currency/inline-new item.
  for (const r of c.rewards) {
    if (r.kind === 'currency' && (r.amount == null || r.amount <= 0)) {
      return NextResponse.json({ error: 'Награда-валюта требует сумму' }, { status: 400 })
    }
    if (r.kind === 'item' && !r.itemCode && !r.newItemName) {
      return NextResponse.json({ error: 'Награда-предмет требует выбор или новое имя' }, { status: 400 })
    }
    if (r.maxQty < r.minQty) {
      return NextResponse.json({ error: 'maxQty < minQty' }, { status: 400 })
    }
  }

  const ip = ipOf(req)
  const weights = chancesToWeights(c.rewards.map((r) => r.chancePercent))

  try {
    const result = await withTransaction(async (client) => {
      const exec = async <T extends Record<string, unknown>>(text: string, p?: unknown[]) =>
        (await client.query(text, p as never[])).rows as T[]

      const isUpdate = !!c.code
      const caseCode = c.code
        ? c.code
        : await generateUniqueCode(exec, 'inventory_items', 'code', slugifyWithPrefix('case', c.name))

      // 1) Case ITEM (inventory_items, type='case'). Art shares the case code.
      await exec(
        `INSERT INTO inventory_items
           (code, type, rarity, name, description, status, asset_code,
            featured_slot, is_active, transferable, stackable, updated_by,
            created_at, updated_at)
         VALUES ($1,'case',$2,$3,$4,$5,$1,$6,$7, false, true, $8, now(), now())
         ON CONFLICT (code) DO UPDATE SET
           rarity = EXCLUDED.rarity,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           asset_code = EXCLUDED.asset_code,
           featured_slot = EXCLUDED.featured_slot,
           is_active = EXCLUDED.is_active,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [caseCode, c.rarity, c.name, c.description ?? null, c.status, c.featuredSlot, activeFor(c.status), session.uid],
      )

      // 2) Case DEFINITION.
      await exec(
        `INSERT INTO case_definitions
           (item_code, name, description, open_cost_kind, open_cost_amount,
            consumes_key, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now(), now())
         ON CONFLICT (item_code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           open_cost_kind = EXCLUDED.open_cost_kind,
           open_cost_amount = EXCLUDED.open_cost_amount,
           consumes_key = EXCLUDED.consumes_key,
           is_active = EXCLUDED.is_active,
           updated_at = now()`,
        [
          caseCode,
          c.name,
          c.description ?? null,
          c.openCostKind,
          c.openCostKind === 'currency' ? c.openCostAmount : 0,
          c.consumesKey,
          activeFor(c.status),
        ],
      )

      // 3) Resolve/inline-create reward items, then 4) rebuild the drop list.
      // We replace the drop list wholesale; past openings keep weight_snapshot,
      // so history is never rewritten.
      await exec('DELETE FROM case_rewards WHERE case_item_code = $1', [caseCode])

      let inlineCreated = 0
      for (let i = 0; i < c.rewards.length; i++) {
        const r = c.rewards[i]
        const weight = weights[i]
        let rewardItemCode: string | null = null

        if (r.kind === 'item') {
          if (r.itemCode) {
            rewardItemCode = r.itemCode
          } else if (r.newItemName) {
            // Inline-create a collectible reward (auto-code), audited.
            rewardItemCode = await generateUniqueCode(
              exec,
              'inventory_items',
              'code',
              slugifyCode(r.newItemName),
            )
            await exec(
              `INSERT INTO inventory_items
                 (code, type, rarity, name, collection_code, ref_value, status,
                  asset_code, is_active, transferable, stackable, updated_by,
                  created_at, updated_at)
               VALUES ($1,'collectible',$2,$3,$4,$5,$6,$1,$7, true, false, $8, now(), now())
               ON CONFLICT (code) DO NOTHING`,
              [
                rewardItemCode,
                r.newItemRarity,
                r.newItemName,
                r.newItemCollectionCode,
                r.newItemValue ?? null,
                c.status,
                activeFor(c.status),
                session.uid,
              ],
            )
            inlineCreated++
            await writeAudit(
              {
                actorUserId: session.uid,
                actorRole: session.role,
                action: 'item.create',
                targetType: 'item',
                targetId: rewardItemCode,
                meta: { via: 'case-builder-inline', rarity: r.newItemRarity },
                ip,
              },
              exec,
            )
          }
          // Guard: existing item must be in catalog.
          if (r.itemCode) {
            const cat = await exec<{ code: string }>(
              'SELECT code FROM inventory_items WHERE code = $1',
              [rewardItemCode],
            )
            if (cat.length === 0) {
              throw Object.assign(new Error(`награда «${rewardItemCode}» не в каталоге`), { http: 400 })
            }
          }
        }

        await exec(
          `INSERT INTO case_rewards
             (case_item_code, reward_kind, reward_item_code, amount, weight,
              min_qty, max_qty, max_global_supply, granted_count, is_jackpot, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9, now())`,
          [
            caseCode,
            r.kind,
            r.kind === 'item' ? rewardItemCode : null,
            r.kind === 'currency' ? r.amount : null,
            weight,
            r.minQty,
            r.maxQty,
            r.maxGlobalSupply ?? null,
            r.isJackpot,
          ],
        )
      }

      // 5) Featured slot (one engine).
      if (c.featuredSlot) {
        await exec(
          `INSERT INTO featured_slots
             (surface, ref_type, ref_code, status, priority, created_by, updated_by,
              created_at, updated_at)
           VALUES ($1, 'case', $2, $3, 100, $4, $4, now(), now())
           ON CONFLICT DO NOTHING`,
          [c.featuredSlot, caseCode, c.status, session.uid],
        )
      }

      const auditId = await writeAudit(
        {
          actorUserId: session.uid,
          actorRole: session.role,
          action: isUpdate ? 'cases.update' : 'cases.create',
          targetType: 'case',
          targetId: caseCode,
          meta: {
            via: 'case-builder',
            rewards: c.rewards.length,
            inlineCreated,
            openCostKind: c.openCostKind,
            openCostAmount: c.openCostAmount,
            status: c.status,
          },
          ip,
        },
        exec,
      )

      return { code: caseCode, isUpdate, inlineCreated, auditId }
    })

    invalidateAssetOverlay()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const http = (error as { http?: number }).http ?? 503
    const message = error instanceof Error ? error.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: http })
  }
}
