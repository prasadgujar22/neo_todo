import { useState } from 'react'
import { buildShareUrl } from '../utils/shareUrl.js'

async function shortenUrl(longUrl) {
  const res = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: longUrl }),
  })
  if (!res.ok) throw new Error('Shorten API error')
  const { short } = await res.json()
  return short
}

export default function ShareButton({ todos }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'copied' | 'error'

  const handleShare = async () => {
    if (status === 'loading') return
    setStatus('loading')

    try {
      const longUrl = buildShareUrl(todos)
      const url = await shortenUrl(longUrl)

      // Try native share sheet first (great on mobile)
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'My Neo Todo List', url })
          setStatus('idle')
          return
        } catch (err) {
          if (err.name === 'AbortError') { setStatus('idle'); return }
          // fall through to clipboard
        }
      }

      await navigator.clipboard.writeText(url)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      console.error('Share failed:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const label =
    status === 'loading' ? 'Shortening…' :
    status === 'copied'  ? 'Link copied!' :
    status === 'error'   ? 'Failed — try again' :
    'Share via Link'

  return (
    <button
      className="shareBtn"
      onClick={handleShare}
      disabled={status === 'loading'}
      aria-label="Share todo list via shortened link"
    >
      {status === 'loading' ? (
        <span className="shareBtn-spinner" aria-hidden="true" />
      ) : status === 'copied' ? (
        // Checkmark
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        // Link icon
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      )}
      {label}
    </button>
  )
}
