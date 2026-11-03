import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { fetchDay } from '../lib/api'
import { dayFull, isISODate, mmdd, stamp } from '../lib/date'
import { commonLabel, sortByMembers, useLoad, usePhotoUrls } from '../lib/hooks'
import { useSession } from '../session'
import { Avatar, ErrorNote, Icon, Lightbox, Loading } from '../components/ui'

/** 주일 나눔 모드: 한 사람씩 크게. 넓은 화면(아이패드/PC)에서는 왼쪽에 사람 목록 */
export default function Share() {
  const { date } = useParams()
  const { members, memberById } = useSession()
  const valid = isISODate(date)
  const { data, error, loading } = useLoad(() => (valid ? fetchDay(date) : Promise.resolve([])), [date])
  const entries = sortByMembers(data ?? [], members)
  const urls = usePhotoUrls(data)
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(false)
  const n = entries.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (zoom) return
      if (e.key === 'ArrowRight') setI((v) => (n ? (v + 1) % n : 0))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n, zoom])

  if (!valid) return <Navigate to="/" replace />

  const done = new Set(entries.map((e) => e.member_id))
  const missing = members.filter((m) => !done.has(m.id))
  const idx = Math.min(i, Math.max(0, n - 1))
  const cur = entries[idx]
  const curName = cur ? (memberById[cur.member_id]?.name ?? '알 수 없음') : ''
  const curUrl = cur?.photo_path ? urls[cur.photo_path] : undefined
  const label = commonLabel(entries)

  return (
    <div className="share">
      <aside className="share__side">
        <div className="share__head">
          <Link to={`/day/${date}`} className="icon-btn" aria-label="나눔 끝내기">
            <Icon name="close" size={22} />
          </Link>
          <div className="stack-xs">
            <span className="muted small">
              {mmdd(date)} {dayFull(date)}
            </span>
            <span className="share__title">{label ?? `${dayFull(date)} 편지`}</span>
          </div>
          <span className="share__counter">{n ? `${idx + 1} / ${n}` : ''}</span>
        </div>

        <nav className="share__people" aria-label="나눌 사람">
          {entries.map((e, k) => {
            const name = memberById[e.member_id]?.name ?? '?'
            return (
              <button
                key={e.id}
                type="button"
                className={k === idx ? 'person is-active' : 'person'}
                aria-current={k === idx ? 'true' : undefined}
                onClick={() => setI(k)}
              >
                <Avatar name={name} size={34} />
                <span className="grow">{name}</span>
                {e.photo_path && (
                  <span className="muted" aria-label="사진 있음">
                    <Icon name="image" size={18} />
                  </span>
                )}
              </button>
            )
          })}
          {missing.map((m) => (
            <div key={m.id} className="person person--missing">
              <Avatar name={m.name} size={34} dashed />
              <span>{m.name} · 답장 전</span>
            </div>
          ))}
        </nav>
      </aside>

      <main className="share__main">
        <div className="share__bars" aria-hidden="true">
          {entries.map((e, k) => (
            <span key={e.id} className={k <= idx ? 'seg seg--on' : 'seg'} />
          ))}
        </div>

        {error && <ErrorNote message={error} />}
        {loading && !data ? (
          <Loading />
        ) : !cur ? (
          <p className="muted center pad">이 날은 아직 답장이 없어요.</p>
        ) : (
          <article className={cur.photo_path ? 'paper share__card has-photo' : 'paper share__card'}>
            {cur.photo_path && (
              <button type="button" className="share__photo" onClick={() => curUrl && setZoom(true)} aria-label="사진 크게 보기">
                {curUrl ? <img src={curUrl} alt={`${curName}의 손글씨 답장`} /> : <span className="photo-ph">사진 불러오는 중…</span>}
              </button>
            )}
            <div className="share__text">
              <div className="reply__head">
                <Avatar name={curName} size={48} />
                <div className="stack-xs">
                  <strong className="share__name">{curName}의 답장</strong>
                  <span className="reply__time">{stamp(cur.created_at)}</span>
                </div>
              </div>
              {cur.body.trim() && <p className="letter-text letter-text--lg">{cur.body}</p>}
            </div>
          </article>
        )}

        {n > 0 && (
          <div className="share__nav">
            <button type="button" className="btn btn--ghost" onClick={() => setI(Math.max(0, idx - 1))} disabled={idx === 0} aria-label="이전 사람">
              <Icon name="left" size={22} />
            </button>
            <button type="button" className="btn btn--primary grow" onClick={() => setI(idx === n - 1 ? 0 : idx + 1)}>
              {idx === n - 1 ? '처음부터 다시' : '다음 사람'} <Icon name="right" />
            </button>
          </div>
        )}
      </main>
      {zoom && curUrl && <Lightbox src={curUrl} onClose={() => setZoom(false)} />}
    </div>
  )
}
