import assert from 'node:assert/strict'
import test from 'node:test'
import handler, { isAllowedShortenUrl } from '../api/shorten.js'

test('shorten URL allow-list accepts only same-origin app URLs', () => {
  assert.equal(isAllowedShortenUrl('https://neo-todo-peach.vercel.app/#share=abc'), true)
  assert.equal(isAllowedShortenUrl('https://example.com/#share=abc'), false)
  assert.equal(isAllowedShortenUrl('not a url'), false)
})

test('shorten handler rejects non-allowlisted URLs before calling TinyURL', async () => {
  const req = { method: 'POST', body: { url: 'https://example.com/phishing' } }
  const res = createMockResponse()

  await handler(req, res)

  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: 'URL is not allowed' })
})

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}
