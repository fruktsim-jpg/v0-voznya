'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

interface AdjacentPlayer {
  userId: number
  name: string
  rank: number
}

interface PlayerNavigationProps {
  currentUserId: number
  currentRank: number | null
}

export function PlayerNavigation({ currentUserId, currentRank }: PlayerNavigationProps) {
  const [prevPlayer, setPrevPlayer] = useState<AdjacentPlayer | null>(null)
  const [nextPlayer, setNextPlayer] = useState<AdjacentPlayer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentRank) {
      setLoading(false)
      return
    }

    // Fetch adjacent players from the leaderboard
    fetch('/api/top-rich?limit=1000')
      .then(res => res.json())
      .then(data => {
        const players = data.items || []
        const currentIndex = players.findIndex((p: any) => p.userId === currentUserId)
        
        if (currentIndex > 0) {
          const prev = players[currentIndex - 1]
          setPrevPlayer({
            userId: prev.userId,
            name: prev.name,
            rank: prev.rank
          })
        }
        
        if (currentIndex < players.length - 1 && currentIndex !== -1) {
          const next = players[currentIndex + 1]
          setNextPlayer({
            userId: next.userId,
            name: next.name,
            rank: next.rank
          })
        }
        
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentUserId, currentRank])

  if (loading || (!prevPlayer && !nextPlayer)) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.75 }}
      className="mt-6 flex items-center justify-between gap-4"
    >
      {prevPlayer ? (
        <Link href={`/profile/${prevPlayer.userId}`} className="flex-1">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 group"
          >
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <div className="flex-1 text-left min-w-0">
              <div className="text-xs text-muted-foreground">#{prevPlayer.rank}</div>
              <div className="font-semibold truncate">{prevPlayer.name}</div>
            </div>
          </Button>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {nextPlayer ? (
        <Link href={`/profile/${nextPlayer.userId}`} className="flex-1">
          <Button
            variant="outline"
            className="w-full justify-end gap-2 group"
          >
            <div className="flex-1 text-right min-w-0">
              <div className="text-xs text-muted-foreground">#{nextPlayer.rank}</div>
              <div className="font-semibold truncate">{nextPlayer.name}</div>
            </div>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </motion.div>
  )
}
