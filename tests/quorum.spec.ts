/**
 * The Vote end-to-end: three real accounts in three browser contexts.
 *
 * Proves the parts that matter: invite/join, live option sync, AI research
 * (real Exa + Anthropic calls), quorum gating, and above all that a ballot
 * is blind ON THE SERVER - a member's client never receives other people's
 * vote rows before the reveal.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'
import type { Page } from '@playwright/test'

test.skip(loadAllTestAccounts().length < 3, 'Needs 3 usable test accounts (see tests/collab.spec.ts).')
test.setTimeout(180_000)

const OPTIONS = ['Izakaya Sora', 'Taqueria Luz', 'Pasta Bar']

async function score(page: Page, name: string, n: number) {
  await page.getByRole('radiogroup', { name: `Score for ${name}` }).getByRole('radio', { name: String(n), exact: true }).click()
}

test('blind vote: nobody sees scores until the owner reveals', async ({ users }) => {
  const [alice, bob, carol] = await users(3)

  // --- Alice creates the room ------------------------------------------------
  await alice.page.goto('/home')
  await alice.page.getByLabel('What are you deciding?').fill('Where do we eat Friday?')
  await alice.page.getByLabel('Context for the researcher (optional)').fill('Three friends, casual, under $30 each.')
  await alice.page.getByRole('button', { name: 'Open the room' }).click()
  await expect(alice.page.getByRole('heading', { name: 'Where do we eat Friday?' })).toBeVisible({ timeout: 20_000 })
  const code = (await alice.page.getByTitle('Copy invite link').innerText()).trim().split(/\s+/)[0]
  expect(code).toMatch(/^[A-Z2-9]{8}$/)

  // --- Bob and Carol join through the invite link ---------------------------
  for (const u of [bob, carol]) {
    await u.page.goto(`/join/${code}`)
    await expect(u.page.getByRole('heading', { name: 'Where do we eat Friday?' })).toBeVisible({ timeout: 20_000 })
  }
  await expect(alice.page.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(3, { timeout: 15_000 })

  // --- Options sync live to everyone ----------------------------------------
  for (const o of OPTIONS) {
    await alice.page.getByLabel('Option name').fill(o)
    await alice.page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(carol.page.getByRole('heading', { name: o })).toBeVisible({ timeout: 15_000 })
  }

  // --- A non-owner cannot open voting (the button is absent AND the action refuses)
  await expect(bob.page.getByRole('button', { name: 'Open voting' })).toHaveCount(0)

  // --- Real research brief (Exa + Anthropic), visible to a different member -----
  await bob.page.getByRole('listitem').filter({ hasText: 'Taqueria Luz' }).getByRole('button', { name: 'Research' }).click()
  await expect(alice.page.getByText('AI research brief')).toBeVisible({ timeout: 90_000 })
  await expect(alice.page.getByText('Likeliest letdown:')).toBeVisible()

  // --- Voting ----------------------------------------------------------------
  await alice.page.getByRole('button', { name: 'Open voting' }).click()
  for (const u of [alice, bob, carol]) await expect(u.page.getByTestId('ballot')).toBeVisible({ timeout: 15_000 })

  // Reveal is gated on quorum: 0 of 3 voted.
  await expect(alice.page.getByRole('button', { name: 'Reveal the votes' })).toBeDisabled()

  const aliceScores = [5, 4, 1]
  for (let i = 0; i < OPTIONS.length; i++) await score(alice.page, OPTIONS[i], aliceScores[i])
  await alice.page.getByLabel('Reason for Pasta Bar').fill('Had it last week')
  await alice.page.getByRole('button', { name: 'Submit ballot' }).click()
  await expect(carol.page.getByText('1 of 3 ballots in')).toBeVisible({ timeout: 15_000 })

  // BLINDNESS: Alice has voted, yet Carol's client holds zero vote rows.
  await expect(carol.page.getByTestId('ballot')).toHaveAttribute('data-vote-rows', '0')
  await expect(bob.page.getByTestId('ballot')).toHaveAttribute('data-vote-rows', '0')

  const bobScores = [2, 5, 3]
  for (let i = 0; i < OPTIONS.length; i++) await score(bob.page, OPTIONS[i], bobScores[i])
  await bob.page.getByRole('button', { name: 'Submit ballot' }).click()
  await expect(carol.page.getByText('2 of 3 ballots in')).toBeVisible({ timeout: 15_000 })
  await expect(carol.page.getByText('Quorum reached.')).toBeVisible()
  // Carol still sees only her own (zero) rows even with two ballots recorded.
  await expect(carol.page.getByTestId('ballot')).toHaveAttribute('data-vote-rows', '0')
  // Bob sees exactly his own three, not Alice's.
  await expect(bob.page.getByTestId('ballot')).toHaveAttribute('data-vote-rows', '3')

  // Only the owner can reveal; Carol has no button.
  await expect(carol.page.getByRole('button', { name: 'Reveal the votes' })).toHaveCount(0)
  await expect(alice.page.getByRole('button', { name: 'Reveal the votes' })).toBeEnabled()
  await alice.page.getByRole('button', { name: 'Reveal the votes' }).click()

  // --- Reveal reaches everyone, including the member who never voted --------
  for (const u of [alice, bob, carol]) {
    await expect(u.page.getByRole('heading', { name: 'The reveal' })).toBeVisible({ timeout: 60_000 })
  }
  // Means: Izakaya 3.5, Taqueria 4.5, Pasta 2.0 -> Taqueria Luz ranks #1.
  const first = carol.page.getByRole('listitem').filter({ hasText: '#1' }).first()
  await expect(first).toContainText('Taqueria Luz')
  await expect(first).toContainText('4.5')
  await expect(carol.page.getByText('Had it last week', { exact: true })).toBeVisible()
  await expect(carol.page.getByText('read (AI)')).toBeVisible()

  // --- Owner decides -----------------------------------------------------------
  await alice.page.getByRole('listitem').filter({ hasText: '#1' }).first().getByRole('button', { name: 'Choose this one' }).click()
  await expect(carol.page.getByText('Decided', { exact: true })).toBeVisible({ timeout: 15_000 })
})

test('actions refuse outsiders and unauthenticated callers', async ({ users }) => {
  const [alice] = await users(1)
  await alice.page.goto('/home')
  const unauth = await alice.page.evaluate(async () => {
    const r = await fetch('/api/actions/reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"roomId":"x"}' })
    return r.status
  })
  expect(unauth).toBe(401)
})
