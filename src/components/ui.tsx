import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type IconName = 'left' | 'right' | 'close' | 'camera' | 'image' | 'pen' | 'cards' | 'check'

const PATHS: Record<IconName, ReactNode> = {
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </>
  ),
  pen: <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />,
  cards: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  )
}

export function Avatar({ name, size = 32, dashed = false }: { name: string; size?: number; dashed?: boolean }) {
  return (
    <span
      className={dashed ? 'avatar avatar--dashed' : 'avatar'}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  )
}

export function TopBar({ back, title, sub, right }: { back?: string; title?: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="topbar">
      {back && (
        <Link to={back} className="icon-btn" aria-label="뒤로">
          <Icon name="left" size={22} />
        </Link>
      )}
      <div className="topbar__text">
        {sub && <span className="muted small">{sub}</span>}
        {title && <span className="topbar__title">{title}</span>}
      </div>
      {right}
    </div>
  )
}

export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="사진 크게 보기" onClick={onClose}>
      <img src={src} alt="손글씨 답장 사진" onClick={(e) => e.stopPropagation()} />
      <button type="button" className="lightbox__close" aria-label="닫기" onClick={onClose}>
        <Icon name="close" size={24} />
      </button>
    </div>
  )
}

export function Loading({ label = '불러오는 중…' }: { label?: string }) {
  return <p className="muted center pad">{label}</p>
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="error-note" role="alert">
      {message}
    </p>
  )
}
