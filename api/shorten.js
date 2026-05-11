/**
 * POST /api/shorten
 * Body: { url: string }
 * Returns: { short: string }
 *
 * Server-side proxy to TinyURL so the browser never hits a CORS wall.
 */

const MAX_URL_LENGTH = 6000
const ALLOWED_HOSTS = new Set([
  'neo-todo-peach.vercel.app',
  'localhost',
  '127.0.0.1',
])

export function isAllowedShortenUrl(value) {
  try {
    if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return false
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return false
    if (!url.hash.startsWith('#share=')) return false
    return ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let url
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    url = body?.url
  } catch {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '`url` is required' })
  }

  if (!isAllowedShortenUrl(url)) {
    return res.status(400).json({ error: 'URL is not allowed' })
  }

  try {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    )
    if (!response.ok) throw new Error(`TinyURL responded ${response.status}`)

    const short = (await response.text()).trim()
    return res.status(200).json({ short })
  } catch (err) {
    console.error('[shorten] error:', err)
    return res.status(200).json({ short: url, warning: 'Shortener unavailable; using full share URL' })
  }
}
