// =============================================================================
// VOZNYA — image validation (Item Authoring IA-1, server-only)
// =============================================================================
//
// Validates uploaded item art WITHOUT a native image lib (sharp is not a
// dependency — see VOZNYA_ITEM_AUTHORING_FOUNDATION_AUDIT §2). We accept PNG and
// WebP only, enforce size limits, and parse intrinsic dimensions straight from
// the file header so the admin/preview layer knows aspect ratio. Real re-encode
// / resize / blurhash (sharp) is a documented later enhancement; the consume
// path (`<img>` + images.unoptimized) renders these bytes as-is today.
// =============================================================================

import 'server-only'
import { createHash } from 'node:crypto'

export const MAX_ASSET_BYTES = 2 * 1024 * 1024 // 2 MB — generous for item art
export const MIN_DIMENSION = 16
export const MAX_DIMENSION = 2048

export type ImageInfo = {
  mime: 'image/png' | 'image/webp'
  width: number | null
  height: number | null
  byteSize: number
  checksum: string
}

export type ImageValidationError = { error: string }

function isPng(buf: Buffer): boolean {
  // 89 50 4E 47 0D 0A 1A 0A
  return (
    buf.length > 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
}

function pngDimensions(buf: Buffer): { width: number; height: number } | null {
  // IHDR is the first chunk; width/height are big-endian uint32 at offset 16/20.
  if (buf.length < 24) return null
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function isWebp(buf: Buffer): boolean {
  return (
    buf.length > 30 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  )
}

function webpDimensions(buf: Buffer): { width: number; height: number } | null {
  // Three VP8 variants: lossy 'VP8 ', lossless 'VP8L', extended 'VP8X'.
  const fmt = buf.toString('ascii', 12, 16)
  try {
    if (fmt === 'VP8 ') {
      // 14 bytes of frame tag; dimensions at offset 26/28 (16-bit, &0x3fff).
      const w = buf.readUInt16LE(26) & 0x3fff
      const h = buf.readUInt16LE(28) & 0x3fff
      return { width: w, height: h }
    }
    if (fmt === 'VP8L') {
      // 1 signature byte (0x2f) then 14-bit width-1, 14-bit height-1.
      const b0 = buf[21]
      const b1 = buf[22]
      const b2 = buf[23]
      const b3 = buf[24]
      const width = 1 + (((b1 & 0x3f) << 8) | b0)
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
      return { width, height }
    }
    if (fmt === 'VP8X') {
      // Canvas size is 24-bit (value+1) at offset 24 (w) and 27 (h), LE.
      const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16))
      const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
      return { width, height }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Validate raw upload bytes. Returns ImageInfo on success or an error object.
 * Dimension parsing is best-effort: unknown dimensions are allowed (null), but
 * a KNOWN out-of-range dimension is rejected.
 */
export function validateImage(buf: Buffer): ImageInfo | ImageValidationError {
  if (buf.length === 0) return { error: 'empty file' }
  if (buf.length > MAX_ASSET_BYTES) {
    return { error: `file too large (max ${Math.round(MAX_ASSET_BYTES / 1024)}KB)` }
  }

  let mime: 'image/png' | 'image/webp'
  let dims: { width: number; height: number } | null

  if (isPng(buf)) {
    mime = 'image/png'
    dims = pngDimensions(buf)
  } else if (isWebp(buf)) {
    mime = 'image/webp'
    dims = webpDimensions(buf)
  } else {
    return { error: 'unsupported format — PNG or WebP only' }
  }

  if (dims) {
    if (
      dims.width < MIN_DIMENSION ||
      dims.height < MIN_DIMENSION ||
      dims.width > MAX_DIMENSION ||
      dims.height > MAX_DIMENSION
    ) {
      return {
        error: `dimensions out of range (${MIN_DIMENSION}-${MAX_DIMENSION}px), got ${dims.width}x${dims.height}`,
      }
    }
  }

  return {
    mime,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    byteSize: buf.length,
    checksum: createHash('sha256').update(buf).digest('hex'),
  }
}

export function isValidationError(
  v: ImageInfo | ImageValidationError,
): v is ImageValidationError {
  return (v as ImageValidationError).error !== undefined
}
