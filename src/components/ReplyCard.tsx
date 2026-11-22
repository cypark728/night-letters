import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { Entry, Member } from '../lib/api'
import { Photo } from './Photo'
import { stamp } from '../lib/date'
import { Avatar, Icon } from './ui'
import { ReplyShareDialog } from './ReplyShareDialog'

interface Props {
  entry: Entry
  member: Member | undefined
  photoUrl?: string
  mine?: boolean
  onOpen: () => void
}

export function ReplyCard({ entry, member, photoUrl, mine, onOpen }: Props) {
  const [sharing, setSharing] = useState(false)
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
      {entry.photo_path && <Photo key={entry.photo_path} path={entry.photo_path} src={photoUrl} alt={`${name}의 답장`} onOpen={onOpen} className="reply__photo" />}
      {mine && <button type="button" className="reply-share-action" onClick={() => setSharing(true)}>내 답장 공유하기</button>}
      {sharing && <ReplyShareDialog reply={{body:entry.body, photoPath:entry.photo_path}} onDone={() => setSharing(false)} />}
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
