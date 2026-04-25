import type { Metadata } from 'next'
import { signOut } from '@/actions/auth'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-mg-border bg-mg-background h-[46px] flex items-center">
        <div className="w-full px-4 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-mg-foreground">
            Midgard
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  )
}
