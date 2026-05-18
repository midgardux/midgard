import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-mg-border bg-mg-background h-[46px] flex items-center">
        <div className="w-full px-4 flex items-center justify-between">
          <Link
            href="/projects"
            className="font-mono text-xs uppercase tracking-widest text-mg-foreground hover:text-mg-foreground-muted transition-colors"
          >
            Midgard
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/account"
              className="font-mono text-xs text-mg-foreground-subtle hover:text-mg-foreground transition-colors"
            >
              Account
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  )
}
