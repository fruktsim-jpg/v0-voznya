import type { ReactNode } from 'react'
import { Section } from '@/components/v2/section'

import { EventFeed } from '@/components/v2/event-feed'
import { MOCK_FEED, type CommunityEvent } from '@/lib/events'

/**
 * Секция «Активность сообщества» (VOZNYA_UI_UX_V2 §4–5). Phase 1 использует
 * mock-ленту из `lib/events`. Server component: оборачивает клиентский EventFeed.
 * `compact` — тизер на главной (без фильтров, ограниченный список).
 */
export function CommunityActivity({
  events = MOCK_FEED,
  limit,
  title = 'Движуха сообщества',
  subtitle = 'Что происходит в Возне прямо сейчас',
  action,
}: {
  events?: CommunityEvent[]
  limit?: number
  title?: string
  subtitle?: string
  action?: ReactNode

}) {
  return (
    <Section title={title} subtitle={subtitle} action={action}>
      <EventFeed events={events} limit={limit} />
    </Section>
  )
}
