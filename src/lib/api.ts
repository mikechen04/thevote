import { getAuthToken } from 'deepspace'

export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

/** Call a server action (src/actions/index.ts) as the signed-in user. */
export async function callAction<T = unknown>(
  name: string,
  params: Record<string, unknown>,
): Promise<ActionResponse<T>> {
  try {
    const token = await getAuthToken()
    const res = await fetch(`/api/actions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    })
    if (res.status === 401) return { success: false, error: 'Please sign in again.', code: 'unauthorized' }
    return (await res.json()) as ActionResponse<T>
  } catch {
    return { success: false, error: 'Network error. Check your connection and try again.', code: 'network' }
  }
}
