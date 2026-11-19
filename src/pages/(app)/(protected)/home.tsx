/**
 * My rooms: list the rooms I belong to, create one, or join with a code.
 * Room visibility is enforced server-side (rooms read: 'team'), so a plain
 * useQuery already returns only my rooms.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useUser } from 'deepspace'
import { Button, Input, Label, Textarea, useToast } from '@/components/ui'
import { callAction } from '../../../lib/api'

type Room = {
  title: string
  question?: string
  phase: 'propose' | 'vote' | 'revealed' | 'decided'
  ownerName?: string
}

const PHASE_LABEL: Record<Room['phase'], string> = {
  propose: 'Proposing',
  vote: 'Voting',
  revealed: 'Revealed',
  decided: 'Decided',
}

export default function HomePage() {
  const { records: rooms, status } = useQuery<Room>('rooms', { orderBy: 'createdAt', orderDir: 'desc' })
  const { user } = useUser()
  const navigate = useNavigate()
  const { error } = useToast()
  const [busy, setBusy] = useState<'create' | 'join' | null>(null)
  const [form, setForm] = useState({ title: '', question: '', city: '', eventDate: '' })
  const [code, setCode] = useState('')

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy('create')
    const r = await callAction<{ roomId: string }>('createRoom', { ...form, displayName: user?.name })
    setBusy(null)
    if (!r.success) return error('Could not create room', r.error)
    navigate(`/room/${r.data.roomId}`)
  }

  async function join(e: React.FormEvent) {
    e.preventDefault()
    setBusy('join')
    const r = await callAction<{ roomId: string }>('joinRoom', { code, displayName: user?.name })
    setBusy(null)
    if (!r.success) return error('Could not join', r.error)
    navigate(`/room/${r.data.roomId}`)
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
      <section>
        <h1 className="font-display text-3xl font-semibold">Your rooms</h1>
        <div className="mt-5 divide-y divide-border border-y border-border">
          {status === 'loading' && <p className="py-6 text-sm text-muted-foreground">Loading…</p>}
          {status !== 'loading' && rooms.length === 0 && (
            <p className="py-8 text-sm text-muted-foreground">
              No rooms yet. Start one on the right, or paste an invite code if someone sent you one.
            </p>
          )}
          {rooms.map((r) => (
            <Link
              key={r.recordId}
              to={`/room/${r.recordId}`}
              className="flex items-center justify-between gap-4 py-4 hover:bg-card/70"
            >
              <span>
                <span className="block font-display text-lg font-semibold">{r.data.title}</span>
                <span className="text-xs text-muted-foreground">Owner: {r.data.ownerName ?? 'unknown'}</span>
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {PHASE_LABEL[r.data.phase] ?? r.data.phase}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <aside className="space-y-8">
        <form onSubmit={create} className="space-y-4 rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-xl font-semibold">New decision</h2>
          <div className="space-y-1.5">
            <Label htmlFor="title">What are you deciding?</Label>
            <Input
              id="title"
              required
              maxLength={100}
              placeholder="Where do we eat Friday?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="question">Context for the researcher (optional)</Label>
            <Textarea
              id="question"
              rows={2}
              maxLength={400}
              placeholder="Six people, one vegetarian, under $30 each."
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City (for weather)</Label>
              <Input id="city" maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            City and date are optional. If the date is within five days, research briefs include the forecast.
          </p>
          <Button type="submit" className="w-full" loading={busy === 'create'}>
            Open the room
          </Button>
        </form>

        <form onSubmit={join} className="space-y-3 rounded-md border border-dashed border-input p-5">
          <h2 className="font-display text-xl font-semibold">Have a code?</h2>
          <Input
            aria-label="Invite code"
            placeholder="ABCD2345"
            maxLength={16}
            className="font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button type="submit" variant="outline" className="w-full" disabled={!code.trim()} loading={busy === 'join'}>
            Join room
          </Button>
        </form>
      </aside>
    </div>
  )
}
