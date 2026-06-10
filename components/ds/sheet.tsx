'use client'

import type { ReactNode } from 'react'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'

/**
 * Sheet (DS) — нижняя шторка (bottom sheet) на базе vaul. Мобильный паттерн для
 * деталей предмета, фильтров, подтверждений. Свайп вниз закрывает, есть ручка.
 * Управляемый (open/onOpenChange) или с собственным триггером (trigger).
 *
 * Client component. Telegram-native ощущение: контент «выезжает» снизу, фон
 * затемняется. Уважает safe-area снизу.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className = '',
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: ReactNode
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-[70] mt-24 flex max-h-[92svh] flex-col rounded-t-3xl border-t border-border bg-popover outline-none',
            className,
          )}
        >
          {/* Ручка для свайпа */}
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/15" />

          <div className="flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
            {(title || description) && (
              <div className="mb-4">
                {title && (
                  <Drawer.Title className="text-lg font-bold text-foreground">
                    {title}
                  </Drawer.Title>
                )}
                {description && (
                  <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </Drawer.Description>
                )}
              </div>
            )}
            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
