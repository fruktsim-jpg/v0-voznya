'use client'

import { useEffect, useRef, useState } from 'react'
import { ItemArt } from '@/components/ds/item-art'
import type { Rarity } from '@/lib/rarity'
import { fieldInputClass } from './admin-form'

/**
 * <AssetUpload> (CC Foundation) — PNG/WebP picker with a LIVE <ItemArt> preview
 * (the real capsule, so what you see is what ships). Controlled: parent owns the
 * selected File. Optionally shows the currently-published art for a code when no
 * new file is picked (via `existingSrc`), so editors show current state.
 */
export function AssetUpload({
  file,
  onFile,
  previewRarity = 'legendary',
  existingSrc,
  size = 'xl',
  accept = 'image/png,image/webp',
}: {
  file: File | null
  onFile: (f: File | null) => void
  previewRarity?: Rarity
  existingSrc?: string | null
  size?: 'md' | 'lg' | 'xl'
  accept?: string
}) {
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shownSrc = localPreview ?? existingSrc ?? undefined

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-black/20 p-4">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Превью</span>
        <ItemArt src={shownSrc} rarity={previewRarity} size={size} />
        <span className="text-[11px] text-muted-foreground">как в кейсах / магазине</span>
      </div>
      <div className="w-full space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className={fieldInputClass}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <button
            type="button"
            onClick={() => {
              onFile(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
          >
            Очистить выбор
          </button>
        )}
        <p className="text-[11px] text-muted-foreground/70">PNG или WebP, до 2 МБ, 16–2048px.</p>
      </div>
    </div>
  )
}
