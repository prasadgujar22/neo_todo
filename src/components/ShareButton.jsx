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
  return short || longUrl
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  return false
}

export default function ShareButton({ todos, groups }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'copied' | 'manual' | 'error'
  const [manualUrl, setManualUrl] = useState('')

  const resetSoon = (delay = 2200) => setTimeout(() => setStatus('idle'), delay)

  const handleShare = async () => {
    if (status === 'loading') return
    setStatus('loading')

    try {
      const longUrl = buildShareUrl({ todos, groups })
      let url = longUrl
      try {
        url = await shortenUrl(longUrl)
      } catch {
        url = longUrl
      }

      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'My Neo Todo List', url })
          setStatus('idle')
          return
        } catch (err) {
          if (err.name === 'AbortError') { setStatus('idle'); return }
        }
      }

      if (await copyToClipboard(url)) {
        setStatus('copied')
        resetSoon()
        return
      }

      setManualUrl(url)
      setStatus('manual')
    } catch (err) {
      console.error('Share failed:', err)
      setStatus('error')
      resetSoon(2500)
    }
  }

  const label =
    status === 'loading' ? 'Preparing…' :
    status === 'copied'  ? 'Link copied!' :
    status === 'manual'  ? 'Copy link below' :
    status === 'error'   ? 'Failed — try again' :
    'Share via Link'

  return (
    <div className="shareBox">
      <button
        className="shareBtn"
        onClick={handleShare}
        disabled={status === 'loading'}
        aria-label="Share todo list via shortened link"
      >
        {status === 'loading' ? (
          <span className="shareBtn-spinner" aria-hidden="true" />
        ) : status === 'copied' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        )}
        {label}
      </button>
      {status === 'manual' && (
        <input
          className="manual-share-url"
          aria-label="Share URL"
          value={manualUrl}
          readOnly
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  )
}
