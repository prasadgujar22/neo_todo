/**
 * POST /api/shorten
 * Body: { url: string }
 * Returns: { short: string }
 *
 * Server-side proxy to TinyURL so the browser never hits a CORS wall.
 */
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

  try {
    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    )
    if (!response.ok) throw new Error(`TinyURL responded ${response.status}`)

    const short = (await response.text()).trim()
    return res.status(200).json({ short })
  } catch (err) {
    console.error('[shorten] error:', err)
    return res.status(500).json({ error: 'Failed to shorten URL' })
  }
}
