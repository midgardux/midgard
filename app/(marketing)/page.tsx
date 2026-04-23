import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Midgard — AI UX Analysis for Solo Designers',
  description:
    'From brief to UX foundation in under 10 minutes. Personas, user flows, information architecture, and synthesis — generated from your product description.',
  openGraph: {
    title: 'Midgard — AI UX Analysis for Solo Designers',
    description: 'From brief to UX foundation in under 10 minutes.',
    url: '/',
    images: ['/opengraph-image.png'],
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LandingPage() {
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
          For solo designers and UX contractors
        </p>
        <h1 className="font-sans text-4xl font-semibold tracking-tight text-mg-foreground leading-tight mb-6">
          Your brief. Four UX artifacts.<br />Ten minutes.
        </h1>
        <p className="font-sans text-mg-foreground-muted max-w-xl mb-10 leading-relaxed">
          Midgard synthesizes product descriptions into personas, user flows,
          information architecture, and a synthesis overview — without prompting,
          without manual formatting.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-mg-accent text-mg-background font-mono text-xs uppercase tracking-wider px-4 py-2 hover:opacity-90 transition-opacity"
        >
          Get started free
        </Link>
      </section>

      {/* Feature highlights */}
      <section className="border-t border-mg-border">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted mb-8">
            What Midgard generates
          </p>
          <ul className="space-y-4">
            <li className="flex gap-4">
              <span className="font-mono text-xs text-mg-foreground-muted mt-0.5 shrink-0">01</span>
              <span className="font-sans text-mg-foreground-muted">
                <span className="text-mg-foreground font-medium">Personas</span> — audience segments with goals, frustrations, and behavioral context
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-xs text-mg-foreground-muted mt-0.5 shrink-0">02</span>
              <span className="font-sans text-mg-foreground-muted">
                <span className="text-mg-foreground font-medium">User flows</span> — task-level step sequences for each persona&apos;s primary job-to-be-done
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-xs text-mg-foreground-muted mt-0.5 shrink-0">03</span>
              <span className="font-sans text-mg-foreground-muted">
                <span className="text-mg-foreground font-medium">Information architecture</span> — site structure and navigation hierarchy derived from the brief
              </span>
            </li>
            <li className="flex gap-4">
              <span className="font-mono text-xs text-mg-foreground-muted mt-0.5 shrink-0">04</span>
              <span className="font-sans text-mg-foreground-muted">
                <span className="text-mg-foreground font-medium">Synthesis overview</span> — a cross-artifact summary of design principles and open questions
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-mg-border">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-widest text-mg-foreground-muted mb-8">
            Pricing
          </p>
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
                <li className="font-sans text-sm text-mg-foreground-muted">
                  3 Realms
                </li>
                <li className="font-sans text-sm text-mg-foreground-muted">
                  All four artifact types
                </li>
                <li className="font-sans text-sm text-mg-foreground-muted">
                  No credit card required
                </li>
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
                <li className="font-sans text-sm text-mg-foreground-muted">
                  Unlimited Realms
                </li>
                <li className="font-sans text-sm text-mg-foreground-muted">
                  All four artifact types
                </li>
                <li className="font-sans text-sm text-mg-foreground-muted">
                  No usage caps
                </li>
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
