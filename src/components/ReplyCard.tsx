import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Entry, Member } from '../lib/api'
import { stamp } from '../lib/date'
import { Avatar, Icon, Lightbox } from './ui'

interface Props {
  entry: Entry
  member: Member | undefined
  photoUrl?: string
  mine?: boolean
}

export function ReplyCard({ entry, member, photoUrl, mine }: Props) {
  const [zoom, setZoom] = useState(false)
  const name = member?.name ?? '알 수 없음'
  return (
    <article className="paper reply">
      <div className="reply__body">
        <div className="reply__head">
          <Avatar name={name} />
          <strong>{name}의 답장</strong>
          <span className="reply__time">{stamp(entry.created_at)}</span>
          {mine && (
            <Link to={`/write?date=${entry.entry_date}`} className="reply__edit" aria-label="내 답장 수정">
              <Icon name="pen" size={16} />
            </Link>
          )}
        </div>
        {!entry.photo_path && entry.body.trim() && <p className="letter-text">{entry.body}</p>}
      </div>
      {entry.photo_path && (
        <button type="button" className="reply__photo" onClick={() => photoUrl && setZoom(true)} aria-label={`${name}의 편지 사진 크게 보기`}>
          {photoUrl ? <img src={photoUrl} alt={`${name}의 손글씨 답장`} loading="lazy" /> : <span className="photo-ph">사진 불러오는 중…</span>}
        </button>
      )}
      {zoom && photoUrl && <Lightbox src={photoUrl} onClose={() => setZoom(false)} />}
    </article>
  )
}

export function MissingCard({ name }: { name: string }) {
  return (
    <div className="missing">
      <Avatar name={name} dashed />
      <span>{name} 님은 아직 답장 전이에요</span>
    </div>
  )
}
