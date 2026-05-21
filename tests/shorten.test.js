import assert from 'node:assert/strict'
import test from 'node:test'
import handler, { createTinyUrl, isAllowedShortenUrl } from '../api/shorten.js'

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

test('createTinyUrl uses the supported authenticated TinyURL API', async () => {
  const previousToken = process.env.TINYURL_API_TOKEN
  process.env.TINYURL_API_TOKEN = 'test-token'

  try {
    const calls = []
    const short = await createTinyUrl('https://neo-todo-peach.vercel.app/#share=abc', async (url, options) => {
      calls.push({ url, options })
      return {
        ok: true,
        async json() {
          return { data: { tiny_url: 'https://tinyurl.com/example' } }
        },
      }
    })

    assert.equal(short, 'https://tinyurl.com/example')
    assert.equal(calls[0].url, 'https://api.tinyurl.com/create')
    assert.equal(calls[0].options.method, 'POST')
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token')
    assert.equal(JSON.parse(calls[0].options.body).url, 'https://neo-todo-peach.vercel.app/#share=abc')
  } finally {
    restoreEnv('TINYURL_API_TOKEN', previousToken)
  }
})

test('createTinyUrl skips TinyURL when no API token is configured', async () => {
  const previousToken = process.env.TINYURL_API_TOKEN
  delete process.env.TINYURL_API_TOKEN

  try {
    const short = await createTinyUrl('https://neo-todo-peach.vercel.app/#share=abc', async () => {
      throw new Error('fetch should not be called without a token')
    })

    assert.equal(short, null)
  } finally {
    restoreEnv('TINYURL_API_TOKEN', previousToken)
  }
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

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}
