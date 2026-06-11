/**
 * Prestige system (A4) barrel. The platform's status layer: tier WORLDS +
 * the components that express them. Import from here.
 */
export { PrestigeFrame } from './prestige-frame'
export { RankBadge, DivisionBadge, TitleBadge } from './prestige-badges'
export {
  PRESTIGE_TIERS,
  PRESTIGE_ORDER,
  prestigeTier,
  prestigeForDivision,
  prestigeForMmrRank,
  prestigeForTitleIndex,
  maxPrestige,
  type PrestigeTier,
  type PrestigeTierKey,
} from '@/lib/ds/prestige'
