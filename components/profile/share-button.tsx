'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Check, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShareButtonProps {
  userId: number
  playerName: string
}

export function ShareButton({ userId, playerName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleTelegramShare = () => {
    const url = `${window.location.origin}/profile/${userId}`
    const text = `Профиль ${playerName} в ВОЗНЕ`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  const handleCopy = async () => {
    const url = `${window.location.origin}/profile/${userId}`
    
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85 }}
      className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2"
    >
      <Button
        onClick={handleTelegramShare}
        className="w-full gap-2"
      >
        <Send className="h-4 w-4" />
        <span>Поделиться в Telegram</span>
      </Button>
      <Button
        variant="outline"
        onClick={handleCopy}
        className="w-full gap-2"
        disabled={copied}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span>Ссылка скопирована!</span>
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            <span>Скопировать ссылку</span>
          </>
        )}
      </Button>
    </motion.div>
  )
}
