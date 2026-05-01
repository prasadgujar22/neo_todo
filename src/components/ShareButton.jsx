import { useState } from 'react'
import { toPng } from 'html-to-image'

export default function ShareButton({ targetRef }) {
  const [loading, setLoading] = useState(false)

  const handleShare = async () => {
    if (!targetRef?.current) return
    setLoading(true)
    try {
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: { backdropFilter: 'none' }
      })

      // Try Web Share API with file (works great on mobile)
      if (typeof navigator.canShare === 'function') {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], 'neo-todo.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'My Neo Todo List', files: [file] })
          setLoading(false)
          return
        }
      }

      // Fallback: trigger download
      const link = document.createElement('a')
      link.download = 'neo-todo.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className="shareBtn"
      onClick={handleShare}
      disabled={loading}
      aria-label="Share todo list as image"
    >
      {loading ? (
        <span className="shareBtn-spinner" aria-hidden="true" />
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share as Image
        </>
      )}
    </button>
  )
}
