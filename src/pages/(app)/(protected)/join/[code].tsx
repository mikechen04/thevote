/** /join/ABCD2345 - invite links land here, join, then forward to the room. */

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useUser } from 'deepspace'
import { callAction } from '../../../../lib/api'

export default function JoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, isLoading } = useUser()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (isLoading || started.current || !code) return
    started.current = true
    callAction<{ roomId: string }>('joinRoom', { code, displayName: user?.name }).then((r) => {
      if (r.success) navigate(`/room/${r.data.roomId}`, { replace: true })
      else setError(r.error)
    })
  }, [code, isLoading, navigate, user?.name])

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {error ? (
        <>
          <h1 className="font-display text-2xl font-semibold">Couldn&rsquo;t join</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link to="/home" className="mt-6 inline-block text-sm text-primary underline underline-offset-4">
            Back to your rooms
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Taking a seat…</p>
      )}
    </div>
  )
}
