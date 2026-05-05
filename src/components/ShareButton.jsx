import { useState } from 'react'
import { buildShareUrl } from '../utils/shareUrl.js'

export default function ShareButton({ todos }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'copied' | 'error'

  const handleShare = async () => {
    const url = buildShareUrl(todos)

    // Try Web Share API first (native share sheet on mobile)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'My Neo Todo List', url })
        return
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if (err.name === 'AbortError') return
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2500)
    }
  }

  const label =
    status === 'copied' ? 'Link copied!' :
    status === 'error'  ? 'Copy failed' :
    'Share via Link'

  return (
    <button
      className="shareBtn"
      onClick={handleShare}
      aria-label="Share todo list via link"
    >
      {status === 'copied' ? (
        // Checkmark icon
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
