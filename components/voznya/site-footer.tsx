import Image from 'next/image'

const CITIES = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Groningen', 'Zwolle']

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-3">
          <Image
            src="/voznya-logo.png"
            alt="Логотип ВОЗНЯ"
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <span className="text-lg font-bold text-gradient">ВОЗНЯ</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {CITIES.join(' • ')}
        </p>
        <p className="text-sm text-muted-foreground">voznya.nl</p>
        <p className="text-xs text-muted-foreground/70">ВОЗНЯ © 2026</p>
      </div>
    </footer>
  )
}
