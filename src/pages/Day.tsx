import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchDay } from '../lib/api'
import { letterForDate, letterGroup, nextLetter, mmdd } from '../lib/date'
import { sortByMembers, useLoad, usePhotoUrls } from '../lib/hooks'
import { useSession } from '../session'
import { ReplyCard } from '../components/ReplyCard'
import { ErrorNote, Lightbox, Loading, TopBar } from '../components/ui'

export default function Day() {
  const { date } = useParams()
  const [params, setParams] = useSearchParams()
  const { me, members, memberById } = useSession()
  const letter = letterForDate(date)
  const { data, error, loading } = useLoad(() => letter ? fetchDay(letter.date) : Promise.resolve([]), [date])
  const entries = sortByMembers(data ?? [], members)
  const urls = usePhotoUrls(data)
  const gallery = entries.filter(e => e.photo_path)
  const activeIndex = gallery.findIndex(e => e.id === params.get('photo'))
  const active = gallery[activeIndex]
  const show = (id:string, replace=false) => setParams({photo:id}, {replace})
  if (!letter) return <Navigate to="/" replace />
  const next = nextLetter(letter.date)
  return <div className="page"><main className="container stack day">
    <TopBar back={`/?w=${letterGroup(letter.date)[0].date}`} sub="편지 모아보기" />
    <h1 className="display display--md">{letter.title}</h1>
    <nav className="chips" aria-label="편지 선택">{letterGroup(letter.date).map(l => <Link key={l.number} className={l.date === date ? 'chip is-on' : 'chip'} to={`/day/${l.date}`}>{l.number}번째<span className="chip__sub">{mmdd(l.date)}</span></Link>)}</nav>
    <div className="row-wrap">
      {entries.length > 0 && <Link to={`/share/${date}`} className="btn btn--primary grow">한 사람씩 함께 읽기</Link>}
      {me && <Link to={`/write?date=${date}`} className="btn btn--ghost grow">내 답장 쓰기 · 수정</Link>}
    </div>
    {error && <ErrorNote message={error} />}
    {loading ? <Loading /> : <div className="reply-grid">{entries.map(e => <ReplyCard key={e.id} entry={e} member={memberById[e.member_id]} photoUrl={e.photo_path ? urls[e.photo_path] : undefined} mine={e.member_id === me?.id} onOpen={() => show(e.id)} />)}</div>}
    {!loading && !error && entries.length === 0 && <p className="muted center">아직 올라온 답장이 없어요.</p>}
    {next ? <Link className="btn btn--ghost" to={`/day/${next.date}`}>{next.title} 읽기 →</Link> : <Link className="btn btn--ghost" to="/">편지 목록으로</Link>}
    {active && <Lightbox path={active.photo_path ?? undefined} src={urls[active.photo_path!]} title={`${memberById[active.member_id]?.name}의 답장`} onClose={() => setParams({}, {replace:true})} onPrevious={activeIndex > 0 ? () => show(gallery[activeIndex-1].id,true) : undefined} onNext={activeIndex < gallery.length-1 ? () => show(gallery[activeIndex+1].id,true) : undefined} />}
  </main></div>
}
