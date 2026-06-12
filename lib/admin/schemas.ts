// =============================================================================
// VOZNYA — SHARED ADMIN VALIDATION (CC Foundation)
// =============================================================================
//
// One zod layer reused by BOTH the client (form validation / disabling submit)
// and the server (route handler hard-validation), so the two never drift. Domain
// enums (rarity, item class) are mirrored from their canonical modules.
// =============================================================================

import { z } from 'zod'
import { RARITY_ORDER } from '@/lib/rarity'
import { CONTENT_STATUSES } from '@/lib/admin/lifecycle'

// item-art/model.ts ItemClass — mirrored as a zod enum (kept in sync by review).
export const ITEM_CLASSES = [
  'cosmetic',
  'title',
  'badge',
  'frame',
  'avatar',
  'collectible',
  'event',
  'gift',
  'premium',
  'case',
  'key',
  'currency',
] as const

/** A stable content code: latin/digits/underscore, 1..64. */
export const codeSchema = z
  .string()
  .trim()
  .min(1, 'Код обязателен')
  .max(64, 'Код до 64 символов')
  .regex(/^[a-z0-9_]+$/i, 'Только латиница, цифры и _')

export const nameSchema = z.string().trim().min(1, 'Название обязательно').max(128)
export const descriptionSchema = z.string().trim().max(2000).optional().nullable()

export const raritySchema = z.enum(RARITY_ORDER as unknown as [string, ...string[]])
export const itemClassSchema = z.enum(ITEM_CLASSES as unknown as [string, ...string[]])
export const statusSchema = z.enum(CONTENT_STATUSES as unknown as [string, ...string[]])

/** Optional ISO datetime (availability windows). Empty string → null. */
export const optionalDate = z
  .union([z.string().datetime({ offset: true }), z.string().length(0), z.null()])
  .optional()
  .transform((v) => (v ? v : null))

/**
 * Optional code: present on edit (immutable key), omitted on create so the
 * server auto-generates it from the name (workflow-first: the operator never
 * invents a technical identifier).
 */
export const optionalCodeSchema = codeSchema.optional().nullable().transform((v) => v || null)

/** Item Builder (IA-2) payload — catalog/content only, never economy/grants. */
export const itemBuilderSchema = z.object({
  code: optionalCodeSchema,
  name: nameSchema,
  description: descriptionSchema,
  itemClass: itemClassSchema,
  rarity: raritySchema,
  collectionCode: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9_]*$/i, 'Только латиница, цифры и _')
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  /**
   * Inline collection creation: when the operator types a brand-new collection
   * name in the item editor, the server creates the collection (auto-code) and
   * links the item to it — no separate `/admin/collections` trip.
   */
  newCollectionName: z.string().trim().min(1).max(128).optional().nullable().transform((v) => (v ? v : null)),
  seriesTotal: z.number().int().min(0).max(100000).optional().nullable(),
  isLimited: z.boolean().optional().default(false),
  maxSupply: z.number().int().min(0).max(100_000_000).optional().nullable(),
  transferable: z.boolean().optional().default(true),
  stackable: z.boolean().optional().default(false),
  availableFrom: optionalDate,
  availableUntil: optionalDate,
  status: statusSchema.optional().default('draft'),
  featuredSlot: z.string().trim().max(32).optional().nullable().transform((v) => (v ? v : null)),
})

export type ItemBuilderInput = z.infer<typeof itemBuilderSchema>

/** Collection (Collections foundation) payload. */
export const collectionSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
  kind: z.enum(['permanent', 'seasonal', 'event']).default('permanent'),
  seasonCode: z.string().trim().max(64).optional().nullable().transform((v) => (v ? v : null)),
  sortOrder: z.number().int().min(0).max(100000).optional().default(100),
  status: statusSchema.optional().default('draft'),
})

export type CollectionInput = z.infer<typeof collectionSchema>

/** Featured slot (Featured slots) payload. */
export const FEATURED_SURFACES = [
  'HOME_HERO',
  'SHOP_HERO',
  'CASES_HERO',
  'PLAY_HERO',
  'CASINO_HERO',
  'SEASON_HERO',
] as const

export const featuredSlotSchema = z.object({
  surface: z.enum(FEATURED_SURFACES as unknown as [string, ...string[]]),
  refType: z.enum(['item', 'case', 'collection', 'gift']),
  refCode: codeSchema,
  title: z.string().trim().max(128).optional().nullable().transform((v) => (v ? v : null)),
  subtitle: z.string().trim().max(256).optional().nullable().transform((v) => (v ? v : null)),
  priority: z.number().int().min(0).max(10000).optional().default(100),
  availableFrom: optionalDate,
  availableUntil: optionalDate,
  status: statusSchema.optional().default('draft'),
})

export type FeaturedSlotInput = z.infer<typeof featuredSlotSchema>

/** Helper: format a zod error into a single human message for Feedback. */
export function firstZodError(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Ошибка валидации'
}
