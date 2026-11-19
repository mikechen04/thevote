# The Vote

A live decision room for groups. People propose options, ask for an AI research brief on each, **vote blind**, and then reveal every score at once, so the first or loudest voice stops deciding for everyone.

Built on the DeepSpace SDK. Live at the URL in the submission note.

## The flow

1. **Propose.** The owner opens a room and shares an 8-character invite code or link. Members add options. Anyone can request a research brief for an option.
2. **Vote.** The owner opens voting. Each member scores every option 1 to 5 with an optional one-line reason, and can revise until the reveal. Everyone sees *who* has voted (and live who is online and scoring), never *what* they scored.
3. **Reveal.** Once more than half the members have a ballot in (the quorum), the owner reveals. Results show rank, mean, the distribution, a "Split room" flag when opinions diverge, every voter's score and reason, and a short AI facilitator note on where the group disagrees.
4. **Decide.** The owner picks the winner and leaves a note for the record.

## DeepSpace pieces used

| Piece | Where | Why |
| --- | --- | --- |
| `RecordRoom` + `useQuery` | every page | Live sync: options, briefs and the "N of M ballots in" bar update for everyone without polling code. |
| RBAC: `read: 'team'` + `team_members` | `src/schemas/quorum-schemas.ts` | A room is a team. Every room-scoped row is filtered by the Durable Object before it is sent, so non-members receive nothing. |
| RBAC: `read: 'own'` + `ownerField` on `votes` | same | The blind vote is enforced on the server: other members' vote rows are never delivered to your client. |
| `uniqueOn` | `ballots`, `votes`, `team_members` | One ballot per person per room, one membership row per person. |
| Server actions | `src/actions/index.ts` | The only writers for room data. Each checks membership, ownership and the room's phase, since actions bypass RBAC. |
| `usePresenceRoom` | room page | Who is here, and who is scoring right now. |
| Integration: `anthropic/chat-completion` | `researchOption`, `reveal` | Turns search results into a structured brief; writes the facilitator note. |
| Integration: `exa/search` | `researchOption` | Finds and extracts sources for each option. |
| Integration: `openweathermap/forecast` | `researchOption` | If the room has a city and a date inside the 5-day forecast window, the brief includes the forecast. |
| Test fixtures (`deepspace/testing`) | `tests/quorum.spec.ts` | Three real accounts in three browser contexts. |

## Tradeoffs

- **All writes go through server actions, not client mutations.** Direct `useMutations` would be simpler and optimistic, but nothing in plain RBAC can say "only while the room is in the vote phase" or "only if you belong to this room". The cost is a round trip per write and no optimistic UI. Reads stay fully live.
- **Blindness comes from `read: 'own'`, and the reveal copies scores into a separate `results` collection.** Flipping a visibility flag on the votes themselves would have been less code, but then "revealed" would be a client-visible state of the same rows. A separate write-once collection keeps the secret rows secret for good.
- **Developer-billed integrations with per-room caps.** Anyone with an invite can trigger research, so the owner pays; each room is capped at 20 research runs, one brief per option unless forced, and 12 options. A production version would bill the caller or meter per account.
- **Quorum is "more than half of members have voted", fixed.** Making it configurable is easy but wasn't the interesting part.
- **Left out on purpose:** payments (nothing to charge for), email invites (a copyable link is enough and avoids sending mail on a user's behalf), file uploads, and the generic AI chat the scaffold ships (it would let a model read and write room data through a second path; I kept the one audited write path).

## What is not done

- Joining after the reveal is refused rather than handled. Members can't be removed or leave.
- Weather uses the forecast's UTC day, so near midnight the date can be off by one for far-from-UTC cities.
- Research quality depends on search results. For a vague option name the model often says the evidence is ambiguous (which is the right behaviour, but not a great demo). Letting the proposer pin a URL and scrape it would fix that.
- No rate limit per user, only per room.
- No mobile polish pass beyond responsive layout.

## Run it

Needs Node 22.15+ (24 recommended) and npm 11.

```bash
npm install
npx deepspace auth login
npx deepspace dev start          # http://localhost:5173
npx deepspace test run tests/quorum.spec.ts   # needs 3 test accounts, see tests/collab.spec.ts
npx deepspace deploy
```

## Layout

```
src/schemas/quorum-schemas.ts   collections + permissions (the security model, commented)
src/actions/index.ts            every mutation, with membership/owner/phase checks
src/pages/(app)/(protected)/    home (my rooms), room/[id], join/[code]
src/pages/index.tsx             static landing page
tests/quorum.spec.ts            three-user end-to-end test, including the blindness assertion
```
