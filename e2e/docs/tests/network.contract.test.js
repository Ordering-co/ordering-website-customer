import assert from 'node:assert/strict'
import test from 'node:test'
import { loadFixture } from '../lib/fixtures.js'
import { assertNoUnknownRequests, createRequestLog, installNetworkGuard } from '../lib/network.js'

const setupGuard = async (fixtureName) => {
  const fixture = await loadFixture(fixtureName)
  const requestLog = createRequestLog()
  let intercept
  await installNetworkGuard({
    route: async (_, handler) => { intercept = handler }
  }, fixture, requestLog)

  const get = async (endpoint) => {
    let status
    await intercept({
      request: () => ({
        method: () => 'GET',
        url: () => `https://api.docs.invalid/v400/en/docsmarket/${endpoint}`,
        postData: () => null
      }),
      fulfill: async (response) => { status = response.status }
    })
    return status
  }

  return { get, requestLog }
}

const missingConfig = 'configs?where=[{"attribute":"key","value":["add_product_with_one_click"]}]&mode=dictionary'

test('the shared guard rejects an unapproved configuration read', async () => {
  const { get, requestLog } = await setupGuard('website-overview')
  assert.equal(await get('configs?mode=dictionary'), 418)
  assert.throws(() => assertNoUnknownRequests(requestLog), /GET https:\/\/api\.docs\.invalid\/v400\/en\/docsmarket\/configs/)
})

test('the shared guard allows one boot read and rejects the repeat', async () => {
  const { get, requestLog } = await setupGuard('website-overview')
  assert.equal(await get(missingConfig), 200)
  assert.doesNotThrow(() => assertNoUnknownRequests(requestLog))
  assert.equal(await get(missingConfig), 418)
  assert.equal(requestLog.matched.length, 1)
  assert.throws(() => assertNoUnknownRequests(requestLog), /GET https:\/\/api\.docs\.invalid\/v400\/en\/docsmarket\/configs/)
})
