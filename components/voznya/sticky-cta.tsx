'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Rocket } from 'lucide-react'

export function StickyCta() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:hidden"
        >
          <button
            onClick={() =>
              document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground shadow-[0_8px_40px_-6px_rgba(139,92,246,0.9)]"
          >
            <Rocket className="h-5 w-5" />
            Вступить в ВОЗНЮ
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
