import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ACHIEVEMENTS, TITLES } from '@/lib/voznya-bot'
import { MMR_RANKS } from '@/lib/mmr'
import { DIVISIONS } from '@/lib/season'
import {
  ADMIN_ROLES,
  ROLE_RANK,
  rolePermissions,
  type AdminRole,
} from '@/lib/auth/admin-permissions'

// Catalog parity (bot↔site). The bot is the source of truth and exports
// docs/catalog-parity.json via scripts/export_catalog_parity.py. These tests
// assert the site's duplicated catalogs match that snapshot — any drift in
// names/emojis/thresholds/rewards/permissions on EITHER side fails a test.
//
// Site-only RBAC additions (the CONTENT_* permissions, Pattern A) are expected:
// we assert the bot's permissions are a SUBSET of the site's, not strict equality.

type Snapshot = {
  mmr_ranks: { minMmr: number; emoji: string; name: string }[]
  divisions: { minMmr: number; emoji: string; name: string; rewardEshki: number }[]
  titles: { minEarned: number; emoji: string; name: string }[]
  achievements: {
    code: string
    emoji: string
    name: string
    description: string
    category: string
    reward: number
    hidden: boolean
  }[]
  rbac: {
    roleRank: Record<string, number>
    rolePermissions: Record<string, string[]>
  }
}

const snap: Snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../../docs/catalog-parity.json'), 'utf-8'),
)

describe('MMR ranks parity', () => {
  it('matches the bot snapshot exactly', () => {
    expect(MMR_RANKS).toEqual(snap.mmr_ranks)
  })
})

describe('Divisions parity', () => {
  it('matches the bot snapshot exactly', () => {
    expect(DIVISIONS).toEqual(snap.divisions)
  })
})

describe('Titles parity', () => {
  it('matches the bot snapshot exactly', () => {
    expect(TITLES).toEqual(snap.titles)
  })
})

describe('Achievements parity', () => {
  const byCode = <T extends { code: string }>(arr: T[]) =>
    Object.fromEntries(arr.map((a) => [a.code, a]))

  it('has the same set of achievement codes', () => {
    const siteCodes = ACHIEVEMENTS.map((a) => a.code).sort()
    const botCodes = snap.achievements.map((a) => a.code).sort()
    expect(siteCodes).toEqual(botCodes)
  })

  it('matches name/emoji/category/reward/hidden for every achievement', () => {
    const site = byCode(ACHIEVEMENTS)
    const drifts: string[] = []
    for (const bot of snap.achievements) {
      const s = site[bot.code]
      if (!s) {
        drifts.push(`missing on site: ${bot.code}`)
        continue
      }
      const fields = ['emoji', 'name', 'category', 'reward', 'hidden'] as const
      for (const f of fields) {
        if ((s as Record<string, unknown>)[f] !== (bot as Record<string, unknown>)[f]) {
          drifts.push(`${bot.code}.${f}: site=${JSON.stringify((s as Record<string, unknown>)[f])} bot=${JSON.stringify((bot as Record<string, unknown>)[f])}`)
        }
      }
    }
    expect(drifts, drifts.join('\n')).toEqual([])
  })
})

describe('RBAC parity', () => {
  it('has the same role list and ranks', () => {
    expect([...ADMIN_ROLES].sort()).toEqual(Object.keys(snap.rbac.roleRank).sort())
    for (const role of ADMIN_ROLES) {
      expect(ROLE_RANK[role]).toBe(snap.rbac.roleRank[role])
    }
  })

  it("the bot's permissions are a subset of the site's for every role", () => {
    for (const role of ADMIN_ROLES as readonly AdminRole[]) {
      const sitePerms = rolePermissions(role)
      const botPerms = snap.rbac.rolePermissions[role] ?? []
      for (const p of botPerms) {
        expect(sitePerms.has(p), `role ${role} missing bot perm ${p}`).toBe(true)
      }
    }
  })

  it('site-only extra permissions are limited to the content.* namespace', () => {
    for (const role of ADMIN_ROLES as readonly AdminRole[]) {
      const sitePerms = [...rolePermissions(role)]
      const botPerms = new Set(snap.rbac.rolePermissions[role] ?? [])
      const extra = sitePerms.filter((p) => !botPerms.has(p))
      for (const p of extra) {
        expect(
          p.startsWith('content.'),
          `unexpected site-only perm ${p} on ${role}`,
        ).toBe(true)
      }
    }
  })
})
