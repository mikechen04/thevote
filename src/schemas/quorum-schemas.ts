/**
 * The Vote collections.
 *
 * Security model in one paragraph: a decision room is a "team". Every
 * room-scoped row carries `teamId` (= the room's recordId) and is readable
 * only by members of that team (`read: 'team'`, resolved by the Durable
 * Object against `team_members` BEFORE anything goes over the WebSocket).
 * Clients can never write any of these collections directly: every mutation
 * goes through a server action (src/actions/index.ts) that checks membership,
 * ownership and the room's phase. The one collection that is private even
 * from fellow members is `votes` (`read: 'own'`) - that is what makes the
 * blind vote blind on the server, not just hidden by the UI.
 */

import type { CollectionSchema, RolePermissions } from 'deepspace/schema'

const NONE: RolePermissions = { read: false, create: false, update: false, delete: false }

/** Read-only for clients; actions (which bypass RBAC) are the only writers. */
const readOnly = (read: RolePermissions['read']): CollectionSchema['permissions'] => ({
  '*': NONE,
  viewer: NONE,
  member: { read, create: false, update: false, delete: false },
  // The app owner is pinned to `admin`. Admin gets the same row-level reads as
  // members on purpose: owning the deployment must not mean reading anyone's ballot.
  admin: { read, create: false, update: false, delete: false },
})

const text = (name: string, extra: Partial<CollectionSchema['columns'][number]> = {}) =>
  ({ name, storage: 'text', interpretation: 'plain', ...extra }) as CollectionSchema['columns'][number]
const num = (name: string, extra: Partial<CollectionSchema['columns'][number]> = {}) =>
  ({ name, storage: 'number', interpretation: 'plain', ...extra }) as CollectionSchema['columns'][number]
const json = (name: string) =>
  ({ name, storage: 'text', interpretation: { kind: 'json' } }) as CollectionSchema['columns'][number]

export const PHASES = ['propose', 'vote', 'revealed', 'decided'] as const
export type Phase = (typeof PHASES)[number]

export const roomsSchema: CollectionSchema = {
  name: 'rooms',
  teamField: 'teamId',
  columns: [
    text('teamId', { required: true }),
    text('title', { required: true }),
    text('question'),
    text('city'),
    text('eventDate'),
    { name: 'phase', storage: 'text', interpretation: { kind: 'select', options: [...PHASES] } },
    text('inviteCode', { required: true }),
    text('ownerId', { required: true }),
    text('ownerName'),
    text('winnerOptionId'),
    text('decisionNote'),
    text('synthesis'),
    num('researchCount'),
  ],
  permissions: readOnly('team'),
}

export const teamMembersSchema: CollectionSchema = {
  name: 'team_members',
  teamField: 'teamId',
  uniqueOn: ['teamId', 'userId'],
  columns: [
    text('teamId', { required: true }),
    text('userId', { required: true }),
    text('userName'),
    text('role'),
    text('status'),
  ],
  permissions: readOnly('team'),
}

export const optionsSchema: CollectionSchema = {
  name: 'options',
  teamField: 'teamId',
  columns: [
    text('teamId', { required: true }),
    text('title', { required: true }),
    text('detail'),
    { name: 'url', storage: 'text', interpretation: { kind: 'url' } },
    text('proposerId'),
    text('proposerName'),
  ],
  permissions: readOnly('team'),
}

export const briefsSchema: CollectionSchema = {
  name: 'briefs',
  teamField: 'teamId',
  columns: [
    text('teamId', { required: true }),
    text('optionId', { required: true }),
    text('summary'),
    json('pros'),
    json('cons'),
    text('risk'),
    json('sources'),
    json('weather'),
    text('requestedBy'),
  ],
  permissions: readOnly('team'),
}

/** Who has voted (not what). Public inside the room so everyone sees the quorum build. */
export const ballotsSchema: CollectionSchema = {
  name: 'ballots',
  teamField: 'teamId',
  uniqueOn: ['teamId', 'userId'],
  columns: [
    text('teamId', { required: true }),
    text('userId', { required: true }),
    text('userName'),
    text('submittedAt'),
  ],
  permissions: readOnly('team'),
}

/** The secret part. `read: 'own'` against `userId` - peers never receive these rows. */
export const votesSchema: CollectionSchema = {
  name: 'votes',
  teamField: 'teamId',
  ownerField: 'userId',
  uniqueOn: ['teamId', 'optionId', 'userId'],
  columns: [
    text('teamId', { required: true }),
    text('optionId', { required: true }),
    text('userId', { required: true, userBound: true, immutable: true }),
    num('score', { required: true }),
    text('reason'),
  ],
  permissions: {
    '*': NONE,
    viewer: NONE,
    member: { read: 'own', create: false, update: false, delete: false },
    admin: { read: 'own', create: false, update: false, delete: false },
  },
}

/** Written once by the reveal action. */
export const resultsSchema: CollectionSchema = {
  name: 'results',
  teamField: 'teamId',
  columns: [
    text('teamId', { required: true }),
    text('optionId', { required: true }),
    num('avg'),
    num('spread'),
    num('count'),
    num('rank'),
    json('distribution'),
    json('voters'),
  ],
  permissions: readOnly('team'),
}

export const quorumSchemas: CollectionSchema[] = [
  roomsSchema,
  teamMembersSchema,
  optionsSchema,
  briefsSchema,
  ballotsSchema,
  votesSchema,
  resultsSchema,
]
