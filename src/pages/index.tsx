/**
 * Landing page - static (no providers), prerendered at build.
 */

import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

const STEPS = [
  {
    n: '1',
    title: 'Put the options on the table',
    body: 'Everyone in the room adds candidates. Anyone can ask for a research brief: sources, pros, cons, and the likeliest way it disappoints.',
  },
  {
    n: '2',
    title: 'Vote without peeking',
    body: 'Score every option 1 to 5. Other members see that you voted, never what you scored. The server withholds those rows, so there is nothing to sneak a look at.',
  },
  {
    n: '3',
    title: 'Reveal together',
    body: 'Once more than half the room has voted, the owner reveals. You get the ranking, the spread of opinion, and a short read on where you actually disagree.',
  },
]

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="min-h-screen bg-background text-foreground">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="font-display text-xl font-semibold">Quorum</span>
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
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-primary">
                Group decisions, minus the anchoring
              </p>
              <h1 className="font-display text-5xl font-semibold leading-[1.02] sm:text-6xl">
                The first person to speak shouldn&rsquo;t pick the restaurant.
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                Quorum is a live room where your group researches the options, votes in secret, and
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
              className="rotate-[1.2deg] rounded-md border border-border bg-card p-6 shadow-[0_2px_0_0_rgba(29,26,22,0.08)]"
            >
              <p className="font-display text-lg font-semibold">Where do we eat Friday?</p>
              <p className="mb-5 mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                3 of 4 ballots in &middot; scores hidden
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

          <section className="border-t border-border bg-card/60">
            <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n}>
                  <p className="font-display text-4xl font-semibold text-primary">{s.n}</p>
                  <h2 className="mt-2 text-base font-semibold">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
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
