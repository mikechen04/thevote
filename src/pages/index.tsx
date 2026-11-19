/**
 * Landing page - static (no providers), prerendered at build.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl font-semibold">The Vote</span>
          <Link
            to="/home"
            className="rounded-md border border-foreground/80 px-4 py-1.5 text-sm font-medium hover:bg-foreground hover:text-background"
          >
            Open the app
          </Link>
        </header>

        <main>
          <section className="mx-auto grid max-w-5xl gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.15fr_1fr] md:items-center md:pt-20">
            <div>
              <h1 className="font-display text-5xl font-semibold leading-[1.02] sm:text-6xl">
                The first person to speak shouldn&rsquo;t pick the restaurant.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                The Vote is a live room where your group researches the options, votes in secret, and
                then reveals every score at once, so the loudest voice stops deciding for everyone.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/home"
                  className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Start a room
                </Link>
                <span className="text-sm text-muted-foreground">Sign in, share a code, decide.</span>
              </div>
            </div>

            {/* A ballot, drawn in markup: the product's one signature object. */}
            <div
              aria-hidden
              className="rotate-[1.2deg] rounded-md border border-border bg-card p-6 shadow-[var(--shadow-card-hover)]"
            >
              <p className="font-display text-lg font-semibold">Where do we eat Friday?</p>
              <p className="mb-5 mt-1 text-sm text-muted-foreground">
                3 of 4 ballots in. Scores hidden
              </p>
              {[
                ['Izakaya Sora', 4],
                ['Taqueria Luz', 5],
                ['Pasta Bar', 2],
              ].map(([name, score]) => (
                <div key={name as string} className="flex items-center justify-between border-t border-border py-3">
                  <span className="text-sm">{name}</span>
                  <span className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`h-5 w-5 rounded-full border ${
                          i <= (score as number) ? 'border-primary bg-primary' : 'border-input'
                        }`}
                      />
                    ))}
                  </span>
                </div>
              ))}
              <p className="mt-4 border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
                Only you can see this card until the owner reveals.
              </p>
            </div>
          </section>
        </main>

        <footer className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground">
          Built on DeepSpace. Research briefs use web search and, when a room has a place and a date
          within five days, a weather forecast.
        </footer>
      </div>
    </>
  )
}
