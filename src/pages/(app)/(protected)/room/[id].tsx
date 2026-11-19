/**
 * The decision room. One page, four phases (propose -> vote -> revealed -> decided).
 * All data is live: useQuery subscribes to the RecordRoom, so every member sees
 * options, briefs and quorum progress change as they happen. Every write is a
 * server action, which is where membership, ownership and phase are enforced.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getUserColor, useAuth, usePresenceRoom, useQuery } from 'deepspace'
import { Check, ExternalLink, Link2, Loader2, Search, Trash2 } from 'lucide-react'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { callAction } from '../../../../lib/api'

type Phase = 'propose' | 'vote' | 'revealed' | 'decided'
type Room = {
  teamId: string
  title: string
  question?: string
  city?: string
  eventDate?: string
  phase: Phase
  inviteCode: string
  ownerId: string
  ownerName?: string
  winnerOptionId?: string
  decisionNote?: string
  synthesis?: string
  researchCount?: number
}
type Member = { userId: string; userName?: string }
type Option = { title: string; detail?: string; url?: string; proposerId?: string; proposerName?: string }
type Brief = {
  optionId: string
  summary?: string
  pros?: string[]
  cons?: string[]
  risk?: string
  sources?: { title: string; url: string }[]
  weather?: { city: string; date: string; lowF: number; highF: number; conditions: string } | null
}
type Ballot = { userId: string; userName?: string }
type Vote = { optionId: string; score: number; reason?: string }
type Result = {
  optionId: string
  avg: number
  spread: number
  count: number
  rank: number
  distribution: number[]
  voters: { name: string; score: number; reason?: string }[]
}

const PHASES: { id: Phase; label: string }[] = [
  { id: 'propose', label: 'Propose' },
  { id: 'vote', label: 'Vote' },
  { id: 'revealed', label: 'Reveal' },
  { id: 'decided', label: 'Decide' },
]

export default function RoomPage() {
  const { id = '' } = useParams()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const { error: toastError, success } = useToast()
  const where = { teamId: id }

  const { records: roomRows, status: roomStatus } = useQuery<Room>('rooms', { where })
  const { records: members } = useQuery<Member>('team_members', { where })
  const { records: options } = useQuery<Option>('options', { where, orderBy: 'createdAt' })
  const { records: briefs } = useQuery<Brief>('briefs', { where })
  const { records: ballots } = useQuery<Ballot>('ballots', { where })
  const { records: myVotes } = useQuery<Vote>('votes', { where })
  const { records: results } = useQuery<Result>('results', { where })
  const { peers, updateState } = usePresenceRoom(`room:${id}`)

  const room = roomRows[0]
  const isOwner = !!room && room.data.ownerId === userId
  const [pending, setPending] = useState<string | null>(null)

  async function run(key: string, action: string, params: Record<string, unknown>, okMsg?: string) {
    setPending(key)
    const r = await callAction(action, { roomId: id, ...params })
    setPending(null)
    if (!r.success) {
      toastError('That did not go through', r.error)
      return false
    }
    if (okMsg) success(okMsg)
    return true
  }

  if (roomStatus === 'loading') return <p className="p-10 text-sm text-muted-foreground">Loading room...</p>
  if (!room) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Room not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may not exist, or you may not be a member. Ask the owner for an invite link.
        </p>
        <Link to="/home" className="mt-6 inline-block text-sm text-primary underline underline-offset-4">
          Back to your rooms
        </Link>
      </div>
    )
  }

  const r = room.data
  const onlineIds = new Set([userId, ...peers.map((p) => p.userId)])
  const votedIds = new Set(ballots.map((b) => b.data.userId))
  const quorumNeeded = Math.floor(members.length / 2) + 1
  const quorumMet = ballots.length >= quorumNeeded
  const briefFor = (optionId: string) => briefs.find((b) => b.data.optionId === optionId)?.data
  const resultFor = (optionId: string) => results.find((x) => x.data.optionId === optionId)?.data

  const inviteUrl = `${window.location.origin}/join/${r.inviteCode}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight">{r.title}</h1>
            {r.question && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{r.question}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Invite code</p>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(inviteUrl)
                success('Invite link copied')
              }}
              className="mt-0.5 inline-flex items-center gap-2 rounded border border-dashed border-input px-3 py-1.5 font-mono text-sm tracking-widest hover:bg-card"
              title="Copy invite link"
            >
              {r.inviteCode} <Link2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <ol className="mt-6 flex items-center gap-2 text-xs uppercase tracking-wider" aria-label="Progress">
          {PHASES.map((p, i) => {
            const current = PHASES.findIndex((x) => x.id === r.phase)
            return (
              <li key={p.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full border px-3 py-1',
                    i === current && 'border-primary bg-primary text-primary-foreground',
                    i < current && 'border-foreground/40 text-foreground',
                    i > current && 'border-border text-muted-foreground',
                  )}
                  aria-current={i === current ? 'step' : undefined}
                >
                  {p.label}
                </span>
                {i < PHASES.length - 1 && <span className="h-px w-6 bg-border" />}
              </li>
            )
          })}
        </ol>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Members">
          {members.map((m) => {
            const online = onlineIds.has(m.data.userId)
            const voted = votedIds.has(m.data.userId)
            return (
              <li
                key={m.recordId}
                className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm"
              >
                <span
                  className="relative flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ background: getUserColor(m.data.userId) }}
                >
                  {(m.data.userName ?? '?')[0]?.toUpperCase()}
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                      online ? 'bg-success' : 'bg-muted-foreground/40',
                    )}
                    title={online ? 'Here now' : 'Away'}
                  />
                </span>
                {m.data.userName}
                {m.data.userId === r.ownerId && <span className="text-[10px] uppercase text-muted-foreground">owner</span>}
                {r.phase === 'vote' && voted && (
                  <span className="flex items-center gap-0.5 text-xs text-success" title="Ballot submitted">
                    <Check className="h-3.5 w-3.5" aria-hidden /> voted
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </header>

      <main className="mt-10 space-y-10">
        {(r.phase === 'propose' || r.phase === 'vote') && (
          <OptionsSection
            room={room}
            options={options}
            briefFor={briefFor}
            isOwner={isOwner}
            userId={userId}
            pending={pending}
            run={run}
          />
        )}

        {r.phase === 'propose' && isOwner && (
          <div className="flex items-center justify-between rounded-md border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {options.length < 2 ? 'Add at least two options to open voting.' : 'Ready? Voting is blind: nobody sees scores until you reveal.'}
            </p>
            <Button disabled={options.length < 2} loading={pending === 'start'} onClick={() => run('start', 'startVoting', {})}>
              Open voting
            </Button>
          </div>
        )}
        {r.phase === 'propose' && !isOwner && (
          <p className="text-sm text-muted-foreground">Waiting for {r.ownerName ?? 'the owner'} to open voting.</p>
        )}

        {r.phase === 'vote' && (
          <>
            <Ballot
              key={myVotes.map((v) => v.data.optionId + v.data.score).join()}
              options={options}
              myVotes={myVotes.map((v) => v.data)}
              hasBallot={!!userId && votedIds.has(userId)}
              pending={pending}
              onFocus={() => updateState({ scoring: true })}
              onBlur={() => updateState({ scoring: false })}
              onSubmit={(scores) => run('ballot', 'submitBallot', { scores }, 'Ballot saved. Scores stay hidden until the reveal.')}
            />
            <QuorumBar
              voted={ballots.length}
              total={members.length}
              needed={quorumNeeded}
              met={quorumMet}
              scoring={peers.filter((p) => p.state.scoring).length}
              isOwner={isOwner}
              loading={pending === 'reveal'}
              onReveal={() => run('reveal', 'reveal', {})}
            />
          </>
        )}

        {(r.phase === 'revealed' || r.phase === 'decided') && (
          <Reveal
            room={room}
            options={options}
            resultFor={resultFor}
            isOwner={isOwner}
            pending={pending}
            onDecide={(optionId, note) => run('decide', 'decide', { optionId, note })}
          />
        )}

        {isOwner && (
          <div className="border-t border-border pt-6">
            <button
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={async () => {
                if (!window.confirm('Delete this room and everything in it? This cannot be undone.')) return
                if (await run('delete', 'deleteRoom', {})) navigate('/home')
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete room
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------- options ---

type RunFn = (key: string, action: string, params: Record<string, unknown>, okMsg?: string) => Promise<boolean>

function OptionsSection({
  room,
  options,
  briefFor,
  isOwner,
  userId,
  pending,
  run,
}: {
  room: { recordId: string; data: Room }
  options: { recordId: string; data: Option }[]
  briefFor: (id: string) => Brief | undefined
  isOwner: boolean
  userId: string | null
  pending: string | null
  run: RunFn
}) {
  const [draft, setDraft] = useState({ title: '', detail: '', url: '' })
  const proposing = room.data.phase === 'propose'

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold">Options</h2>
      <ul className="mt-4 space-y-3">
        {options.length === 0 && <li className="text-sm text-muted-foreground">Nothing proposed yet.</li>}
        {options.map((o) => {
          const brief = briefFor(o.recordId)
          const canRemove = proposing && (o.data.proposerId === userId || isOwner)
          const researching = pending === `research:${o.recordId}`
          return (
            <li key={o.recordId} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold">{o.data.title}</h3>
                  {o.data.detail && <p className="mt-0.5 text-sm text-muted-foreground">{o.data.detail}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Proposed by {o.data.proposerName ?? 'a member'}
                    {o.data.url && (
                      <>
                        {' · '}
                        <a href={o.data.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                          link <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!brief && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={researching}
                      disabled={(room.data.researchCount ?? 0) >= 20}
                      onClick={() => run(`research:${o.recordId}`, 'researchOption', { optionId: o.recordId })}
                    >
                      {!researching && <Search aria-hidden />} Research
                    </Button>
                  )}
                  {canRemove && (
                    <Button size="icon" variant="ghost" aria-label={`Remove ${o.data.title}`} onClick={() => run(`rm:${o.recordId}`, 'removeOption', { optionId: o.recordId })}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
              {researching && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Searching the web and reading the results. About 10 seconds.
                </p>
              )}
              {brief && <BriefCard brief={brief} />}
            </li>
          )
        })}
      </ul>

      {proposing && (
        <form
          className="mt-4 grid gap-3 rounded-md border border-dashed border-input p-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await run('add', 'addOption', draft)) setDraft({ title: '', detail: '', url: '' })
          }}
        >
          <Input aria-label="Option name" required maxLength={80} placeholder="Option name" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input aria-label="Note" maxLength={400} placeholder="Why it's on the list (optional)" value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} />
          <Button type="submit" loading={pending === 'add'}>Add</Button>
          <Input aria-label="Link" type="url" className="sm:col-span-3" placeholder="Link (optional)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
        </form>
      )}
    </section>
  )
}

function BriefCard({ brief }: { brief: Brief }) {
  return (
    <div className="mt-4 border-t border-border pt-4 text-sm">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">AI research brief</p>
      {brief.summary && <p className="mt-1.5 leading-relaxed">{brief.summary}</p>}
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <ul className="space-y-1">
          {(brief.pros ?? []).map((p, i) => (
            <li key={i} className="flex gap-2"><span className="text-success" aria-hidden>+</span>{p}</li>
          ))}
        </ul>
        <ul className="space-y-1">
          {(brief.cons ?? []).map((p, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary" aria-hidden>&minus;</span>{p}</li>
          ))}
        </ul>
      </div>
      {brief.risk && (
        <p className="mt-3 rounded bg-muted px-3 py-2">
          <span className="font-medium">Likeliest letdown:</span> {brief.risk}
        </p>
      )}
      {brief.weather && (
        <p className="mt-2 text-muted-foreground">
          Forecast for {brief.weather.city} on {brief.weather.date}: {brief.weather.lowF}&ndash;{brief.weather.highF}&deg;F, {brief.weather.conditions}.
        </p>
      )}
      {(brief.sources?.length ?? 0) > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {brief.sources!.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary">
                {s.title.slice(0, 50)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ----------------------------------------------------------------- ballot ---

function Ballot({
  options,
  myVotes,
  hasBallot,
  pending,
  onSubmit,
  onFocus,
  onBlur,
}: {
  options: { recordId: string; data: Option }[]
  myVotes: Vote[]
  hasBallot: boolean
  pending: string | null
  onSubmit: (scores: Record<string, { score: number; reason: string }>) => void
  onFocus: () => void
  onBlur: () => void
}) {
  // Seeded once from my own saved votes (the server only ever sends me mine);
  // the parent re-keys this component when those saved votes change.
  const [scores, setScores] = useState<Record<string, { score: number; reason: string }>>(() =>
    Object.fromEntries(myVotes.map((v) => [v.optionId, { score: v.score, reason: v.reason ?? '' }])),
  )

  const complete = options.every((o) => scores[o.recordId]?.score)

  return (
    <section className="rounded-md border-2 border-foreground/80 bg-card p-5" onFocus={onFocus} onBlur={onBlur}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold">Your ballot</h2>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Private until reveal</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">1 = no way, 5 = yes please. You can change your answers until the owner reveals.</p>
      <ul className="mt-4 divide-y divide-border">
        {options.map((o) => {
          const cur = scores[o.recordId]
          return (
            <li key={o.recordId} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium">{o.data.title}</span>
                <div role="radiogroup" aria-label={`Score for ${o.data.title}`} className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      role="radio"
                      aria-checked={cur?.score === n}
                      onClick={() => setScores({ ...scores, [o.recordId]: { score: n, reason: cur?.reason ?? '' } })}
                      className={cn(
                        'h-9 w-9 rounded-full border text-sm font-medium transition-colors',
                        cur?.score === n ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-accent',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                aria-label={`Reason for ${o.data.title}`}
                className="mt-2 h-8 text-sm"
                maxLength={240}
                placeholder="One-line reason (shown at the reveal)"
                value={cur?.reason ?? ''}
                onChange={(e) => setScores({ ...scores, [o.recordId]: { score: cur?.score ?? 0, reason: e.target.value } })}
              />
            </li>
          )
        })}
      </ul>
      <Button className="mt-2" disabled={!complete} loading={pending === 'ballot'} onClick={() => onSubmit(scores)}>
        {hasBallot ? 'Update ballot' : 'Submit ballot'}
      </Button>
      {!complete && <span className="ml-3 text-xs text-muted-foreground">Score every option to submit.</span>}
    </section>
  )
}

function QuorumBar({
  voted,
  total,
  needed,
  met,
  scoring,
  isOwner,
  loading,
  onReveal,
}: {
  voted: number
  total: number
  needed: number
  met: boolean
  scoring: number
  isOwner: boolean
  loading: boolean
  onReveal: () => void
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-xl font-semibold">
            {voted} of {total} ballots in
          </p>
          <p className="text-sm text-muted-foreground">
            {met ? 'Quorum reached.' : `Quorum needs ${needed}.`}
            {scoring > 0 && ` ${scoring} other${scoring > 1 ? 's are' : ' is'} scoring right now.`}
          </p>
        </div>
        {isOwner ? (
          <Button disabled={!met} loading={loading} onClick={onReveal}>
            Reveal the votes
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">The owner reveals once there is a quorum.</p>
        )}
      </div>
      <div className="mt-4 flex gap-1" aria-hidden>
        {Array.from({ length: Math.max(total, 1) }, (_, i) => (
          <span key={i} className={cn('h-2 flex-1 rounded-full', i < voted ? 'bg-primary' : 'bg-muted')} />
        ))}
      </div>
    </section>
  )
}

// ----------------------------------------------------------------- reveal ---

function Reveal({
  room,
  options,
  resultFor,
  isOwner,
  pending,
  onDecide,
}: {
  room: { recordId: string; data: Room }
  options: { recordId: string; data: Option }[]
  resultFor: (id: string) => Result | undefined
  isOwner: boolean
  pending: string | null
  onDecide: (optionId: string, note: string) => void
}) {
  const [note, setNote] = useState('')
  const ranked = useMemo(
    () =>
      options
        .map((o) => ({ o, res: resultFor(o.recordId) }))
        .filter((x): x is { o: (typeof options)[number]; res: Result } => !!x.res)
        .sort((a, b) => a.res.rank - b.res.rank),
    [options, resultFor],
  )
  const decided = room.data.phase === 'decided'
  const winner = options.find((o) => o.recordId === room.data.winnerOptionId)

  return (
    <section>
      {decided && winner && (
        <div className="mb-8 rounded-md border-2 border-primary bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Decided</p>
          <p className="mt-2 font-display text-4xl font-semibold">{winner.data.title}</p>
          {room.data.decisionNote && <p className="mt-3 text-muted-foreground">{room.data.decisionNote}</p>}
        </div>
      )}

      <h2 className="font-display text-2xl font-semibold">The reveal</h2>
      {room.data.synthesis && (
        <div className="mt-4 rounded-md bg-muted p-4 text-sm leading-relaxed">
          <p className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">Facilitator&rsquo;s read (AI)</p>
          {room.data.synthesis}
        </div>
      )}

      <ol className="mt-5 space-y-4">
        {ranked.map(({ o, res }) => {
          const split = res.spread >= 1.2
          return (
            <li
              key={o.recordId}
              className={cn('rounded-md border bg-card p-4', o.recordId === room.data.winnerOptionId ? 'border-primary' : 'border-border')}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">
                  <span className="mr-2 text-muted-foreground">#{res.rank}</span>
                  {o.data.title}
                </h3>
                <p className="text-sm">
                  <span className="font-display text-2xl font-semibold">{res.avg.toFixed(1)}</span>
                  <span className="text-muted-foreground"> / 5</span>
                  {split && (
                    <span className="ml-3 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Split room</span>
                  )}
                </p>
              </div>

              <div className="mt-3 flex items-end gap-1.5" aria-label={`Score distribution for ${o.data.title}`}>
                {res.distribution.map((c, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-10 w-full items-end">
                      <div
                        className="w-full rounded-sm bg-primary/70"
                        style={{ height: `${res.count ? (c / res.count) * 100 : 0}%`, minHeight: c ? 4 : 0 }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{i + 1}</span>
                  </div>
                ))}
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {res.voters.map((v, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-24 shrink-0 truncate text-muted-foreground">{v.name}</span>
                    <span className="w-5 shrink-0 font-medium">{v.score}</span>
                    <span className="text-muted-foreground">{v.reason}</span>
                  </li>
                ))}
              </ul>

              {isOwner && !decided && (
                <Button size="sm" variant="outline" className="mt-3" loading={pending === 'decide'} onClick={() => onDecide(o.recordId, note)}>
                  Choose this one
                </Button>
              )}
            </li>
          )
        })}
      </ol>

      {isOwner && !decided && (
        <Textarea
          className="mt-4"
          rows={2}
          maxLength={400}
          aria-label="Decision note"
          placeholder="Note for the record (optional), e.g. 'Booking at 7pm, Maya reserves.'"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
      {!isOwner && !decided && <p className="mt-4 text-sm text-muted-foreground">Waiting for {room.data.ownerName ?? 'the owner'} to make the call.</p>}
    </section>
  )
}
