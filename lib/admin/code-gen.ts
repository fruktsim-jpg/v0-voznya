// =============================================================================
// VOZNYA — AUTO CODE GENERATION (CC Foundation, workflow-first)
// =============================================================================
//
// The operator should NEVER invent a technical identifier (`gift_bear_rare`,
// `relic_utrecht`, `case_xmas_2027`). The system derives a stable code from the
// human name: transliterate Cyrillic → latin, lowercase, collapse to
// latin/digits/_, trim, and bound length. Uniqueness is resolved server-side by
// appending `_2`, `_3`… so two "Реликвия Утрехта" never collide.
//
// `slugifyCode` is pure (safe on client for live preview); `generateUniqueCode`
// runs inside a server transaction with the table's `exec`.
// =============================================================================

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
}

/** Pure: human name → stable code seed (latin/digits/_, lowercase, ≤64). */
export function slugifyCode(name: string, fallback = 'item'): string {
  const lowered = (name ?? '').toLowerCase().trim()
  let out = ''
  for (const ch of lowered) {
    if (ch in CYRILLIC_MAP) out += CYRILLIC_MAP[ch]
    else if (/[a-z0-9]/.test(ch)) out += ch
    else out += '_'
  }
  // Collapse runs of underscores, trim edge underscores, bound length.
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)
  return out || fallback
}

/** Optional prefix builder, e.g. prefixed('gift', 'Сердечко') → 'gift_serdechko'. */
export function slugifyWithPrefix(prefix: string, name: string, fallback = 'item'): string {
  const base = slugifyCode(name, fallback)
  const p = slugifyCode(prefix, '')
  if (!p) return base
  return `${p}_${base}`.replace(/_+/g, '_').slice(0, 64)
}

type ExecFn = <T extends Record<string, unknown>>(text: string, p?: unknown[]) => Promise<T[]>

/**
 * Resolve a collision-free code in `table.column`, starting from `base`.
 * Tries `base`, then `base_2`, `base_3`, … Caps attempts to avoid runaway.
 * `column` must be a trusted identifier (never user input).
 */
export async function generateUniqueCode(
  exec: ExecFn,
  table: string,
  column: string,
  base: string,
): Promise<string> {
  const seed = base.slice(0, 60) || 'item'
  for (let attempt = 0; attempt < 1000; attempt++) {
    const candidate = attempt === 0 ? seed : `${seed}_${attempt + 1}`.slice(0, 64)
    const rows = await exec<{ code: string }>(
      `SELECT ${column} AS code FROM ${table} WHERE ${column} = $1`,
      [candidate],
    )
    if (rows.length === 0) return candidate
  }
  // Extremely unlikely fallback: timestamp suffix.
  return `${seed}_${Date.now()}`.slice(0, 64)
}
