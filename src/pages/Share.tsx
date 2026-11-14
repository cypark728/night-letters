import { useEffect, useState, useCallback } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { fetchDay } from '../lib/api'
import { letterForDate, letterGroup, nextLetter } from '../lib/date'
import { sortByMembers, useLoad, usePhotoUrls } from '../lib/hooks'
import { useSession } from '../session'
import { Avatar, ErrorNote, Icon, Lightbox, Loading } from '../components/ui'

export default function Share() {
  const { date } = useParams()
  const nav = useNavigate()
  const { members, memberById } = useSession()
  const letter = letterForDate(date)
  const { data, error, loading } = useLoad(() => letter ? fetchDay(letter.date) : Promise.resolve([]), [date])
  const entries = sortByMembers(data ?? [], members)
  const urls = usePhotoUrls(data)
  const [position, setPosition] = useState({ date, index: 0 })
  const [zoom, setZoom] = useState(false)
  const idx = position.date === date ? Math.min(position.index, Math.max(0, entries.length - 1)) : 0
  const cur = entries[idx]
  const curName = cur ? (memberById[cur.member_id]?.name ?? '알 수 없음') : ''
  const curUrl = cur?.photo_path ? urls[cur.photo_path] : undefined
  const next = letter ? nextLetter(letter.date) : undefined
  const atGroupEnd = !next || (letter && letterGroup(letter.date).at(-1)?.date === letter.date)
  const advance = useCallback(() => {
    if (idx < entries.length - 1) setPosition({date, index: idx + 1})
    else nav(atGroupEnd ? '/' : `/share/${next?.date}`)
  }, [idx, entries.length, date, nav, atGroupEnd, next?.date])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (zoom || loading || error) return
      if (e.key === 'ArrowRight') advance()
      if (e.key === 'ArrowLeft') setPosition({date, index: Math.max(0, idx - 1)})
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoom, loading, error, advance, date, idx])
  if (!letter) return <Navigate to="/" replace />
  return <div className="share">
    <aside className="share__side">
      <div className="share__head"><Link to={`/day/${date}`} className="icon-btn" aria-label="모아보기로"><Icon name="close" /></Link><strong>{letter.title}</strong><span>{entries.length ? `${idx + 1} / ${entries.length}` : ''}</span></div>
      <nav className="share__people" aria-label="답장 선택">{entries.map((e,k) => <button key={e.id} type="button" className={k === idx ? 'person is-active' : 'person'} onClick={() => setPosition({date, index:k})}><Avatar name={memberById[e.member_id]?.name ?? '?'} /><span>{memberById[e.member_id]?.name}</span></button>)}</nav>
    </aside>
    <main className="share__main">
      {error && <ErrorNote message={error} />}
      {loading ? <Loading /> : cur ? <article className={cur.photo_path ? 'paper share__card has-photo' : 'paper share__card'}>
        <div className="share__text"><div className="reply__head"><Avatar name={curName} /><strong className="share__name">{curName}의 답장</strong></div>{!cur.photo_path && cur.body.trim() && <p className="letter-text letter-text--lg">{cur.body}</p>}</div>
        {cur.photo_path && <button type="button" className="share__photo" onClick={() => curUrl && setZoom(true)} aria-label={`${curName}의 사진 전체 화면으로 보기`}>{curUrl ? <img src={curUrl} alt={`${curName}의 답장`} /> : <span className="photo-ph">사진 불러오는 중…</span>}</button>}
      </article> : !error && <p className="muted center pad">아직 올라온 답장이 없어요.</p>}
      {!loading && !error && <div className="share__nav"><button type="button" className="btn btn--ghost" disabled={idx === 0} onClick={() => setPosition({date, index:idx-1})} aria-label="이전 답장"><Icon name="left" /></button><button type="button" className="btn btn--primary grow" onClick={advance}>{idx < entries.length - 1 ? '다음 사람' : atGroupEnd ? '함께 읽기 마치기' : `${next?.title}로`}<Icon name="right" /></button></div>}
    </main>
    {zoom && curUrl && <Lightbox src={curUrl} onClose={() => setZoom(false)} />}
  </div>
}
