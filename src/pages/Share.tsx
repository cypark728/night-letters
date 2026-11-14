import { useEffect, useState, useCallback } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchDay } from '../lib/api'
import { LETTERS, letterForDate, letterGroup, nextLetter } from '../lib/date'
import { sortByMembers, useLoad, usePhotoUrls } from '../lib/hooks'
import { useSession } from '../session'
import { Photo } from '../components/Photo'
import { Avatar, ErrorNote, Icon, Lightbox, Loading } from '../components/ui'

export default function Share() {
  const { date } = useParams()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { members, memberById } = useSession()
  const letter = letterForDate(date)
  const { data, error, loading } = useLoad(() => letter ? fetchDay(letter.date) : Promise.resolve([]), [date])
  const entries = sortByMembers(data ?? [], members)
  const urls = usePhotoUrls(data)
  const [position, setPosition] = useState({ date, index: 0 })
  const zoom = params.get('photo') === '1'
  const setZoom = (open:boolean) => { const p = new URLSearchParams(params); if(open) p.set('photo','1'); else p.delete('photo'); setParams(p, {replace:!open}) }
  const idx = position.date === date ? Math.min(position.index, Math.max(0, entries.length - 1)) : params.get('last') === '1' ? Math.max(0, entries.length-1) : 0
  const cur = entries[idx]
  const curName = cur ? (memberById[cur.member_id]?.name ?? '알 수 없음') : ''
  const curUrl = cur?.photo_path ? urls[cur.photo_path] : undefined
  const next = letter ? nextLetter(letter.date) : undefined
  const atGroupEnd = !next || (letter && letterGroup(letter.date).at(-1)?.date === letter.date)
  const advance = useCallback(() => {
    if (idx < entries.length - 1) setPosition({date, index: idx + 1})
    else nav(atGroupEnd ? '/' : `/share/${next?.date}${zoom ? '?photo=1' : ''}`, {replace:zoom})
  }, [idx, entries.length, date, nav, atGroupEnd, next?.date, zoom])
  const previousLetter = letter && letter.number > 1 ? LETTERS[letter.number-2] : undefined
  const retreat = () => {
    if(idx > 0) setPosition({date, index:idx-1})
    else if(previousLetter) nav(`/share/${previousLetter.date}?last=1${zoom ? '&photo=1' : ''}`, {replace:zoom})
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (zoom || loading || error) return
      if (e.key === 'ArrowRight') advance()
      if (e.key === 'ArrowLeft') retreat()
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
        {cur.photo_path && <Photo key={cur.photo_path} path={cur.photo_path} src={curUrl} alt={`${curName}의 답장`} className="share__photo" onOpen={() => setZoom(true)} />}
      </article> : !error && <p className="muted center pad">아직 올라온 답장이 없어요.</p>}
      {!loading && !error && <div className="share__nav"><button type="button" className="btn btn--ghost" disabled={idx === 0 && !previousLetter} onClick={retreat} aria-label="이전 답장"><Icon name="left" /></button><button type="button" className="btn btn--primary grow" onClick={advance}>{idx < entries.length - 1 ? '다음 사람' : atGroupEnd ? '함께 읽기 마치기' : `${next?.title}로`}<Icon name="right" /></button></div>}
    </main>
    {zoom && !loading && cur && <Lightbox src={curUrl} path={cur.photo_path ?? undefined} title={`${curName}의 답장`} onClose={() => setZoom(false)} onPrevious={idx > 0 || previousLetter ? retreat : undefined} onNext={advance} />}
  </div>
}
