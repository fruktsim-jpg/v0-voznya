'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function ScrollToAnchor() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get hash from URL
    const hash = window.location.hash

    if (hash) {
      // Remove the # symbol
      const id = hash.replace('#', '')
      
      // Wait for content to load, then scroll
      const timeoutId = setTimeout(() => {
        const element = document.getElementById(id)
        
        if (element) {
          // Scroll with smooth behavior and a small breathing offset
          const yOffset = -16
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
          
          window.scrollTo({
            top: y,
            behavior: 'smooth'
          })
        }
      }, 100) // Small delay to ensure content is rendered

      return () => clearTimeout(timeoutId)
    }
  }, [searchParams])

  return null
}
