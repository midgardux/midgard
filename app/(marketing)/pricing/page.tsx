import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pricing — Midgard',
  description: 'Simple, transparent pricing. Start free with 3 Realms. Upgrade to Pro for unlimited Realms.',
  openGraph: {
    title: 'Pricing — Midgard',
    description: 'Simple, transparent pricing. Start free with 3 Realms. Upgrade to Pro for unlimited Realms.',
    url: '/pricing',
    images: ['/opengraph-image.png'],
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-mg-background text-mg-foreground">
      {/* Nav */}
      <nav className="border-b border-mg-border">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-mg-foreground">
            Midgard
          </span>
          <Link
            href="/login"
            className="border border-mg-border text-mg-foreground-subtle font-mono text-xs px-3 py-1.5 hover:text-mg-foreground transition-colors"
          >
            Log in
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20">
          <p className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted mb-6">
            Pricing
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-mg-foreground leading-tight mb-6">
            Simple, transparent pricing.
          </h1>
          <p className="font-sans text-mg-foreground-muted max-w-xl mb-10 leading-relaxed">
            Start free with 3 Realms. Upgrade when you need more.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity"
          >
            Get started free
          </Link>
        </section>

        {/* Pricing grid */}
        <section className="border-t border-mg-border">
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Free tier */}
              <div className="border border-mg-border p-6 flex flex-col gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted mb-1">
                    Free
                  </p>
                  <p className="font-mono text-2xl text-mg-foreground">$0</p>
                </div>
                <ul className="space-y-2 flex-1">
                  <li className="font-sans text-sm text-mg-foreground-muted">3 Realms</li>
                  <li className="font-sans text-sm text-mg-foreground-muted">All four artifact types</li>
                  <li className="font-sans text-sm text-mg-foreground-muted">No credit card required</li>
                </ul>
                <Link
                  href="/signup"
                  className="inline-block border border-mg-border text-mg-foreground-subtle font-mono text-xs uppercase tracking-wider px-4 py-2 text-center hover:text-mg-foreground transition-colors"
                >
                  Start free
                </Link>
              </div>

              {/* Pro tier */}
              <div className="border border-mg-border p-6 flex flex-col gap-4 bg-mg-surface">
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted mb-1">
                    Pro
                  </p>
                  <p className="font-mono text-2xl text-mg-foreground">
                    $19
                    <span className="font-sans text-sm text-mg-foreground-muted ml-1">/month</span>
                  </p>
                </div>
                <ul className="space-y-2 flex-1">
                  <li className="font-sans text-sm text-mg-foreground-muted">Unlimited Realms</li>
                  <li className="font-sans text-sm text-mg-foreground-muted">All four artifact types</li>
                  <li className="font-sans text-sm text-mg-foreground-muted">No usage caps</li>
                </ul>
                <Link
                  href="/signup?plan=pro"
                  className="inline-block border border-mg-border text-mg-foreground-subtle font-mono text-xs uppercase tracking-wider px-4 py-2 text-center hover:text-mg-foreground transition-colors"
                >
                  Get Pro
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-mg-border">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="font-mono text-xs text-mg-foreground-muted">
            © 2026 Midgard
          </p>
        </div>
      </footer>
    </div>
  )
}
