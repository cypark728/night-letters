import { Link, useSearchParams } from 'react-router-dom'
import { addDays, defaultWriteDate, isISODate, mmdd, weekDays, weekLabel, weekStartFor, dayFull } from '../lib/date'
import { useSession } from '../session'
import { Icon } from '../components/ui'

export default function Home() {
  const { me, leave } = useSession()
  const [params, setParams] = useSearchParams()
  const w = params.get('w')
  const monday = weekStartFor(isISODate(w) ? w : defaultWriteDate())
  const today = defaultWriteDate()
  return <div className="page"><main className="container narrow stack pad">
    <span className="brand">하나님의 밤편지</span>
    <h1 className="display">하루 한 장,<br />함께 읽는 마음.</h1>
    <p className="soft">늦게 쓴 편지도 그날에 모여 있어요.</p>
    <div className="row-wrap">
      <Link className="btn btn--primary grow" to={`/day/${today}`}>오늘 편지 읽기</Link>
      <Link className="btn btn--ghost grow" to={`/write?date=${today}`}>내 답장 쓰기</Link>
    </div>
    <div className="weeknav">
      <button type="button" className="icon-btn" aria-label="지난주" onClick={() => setParams({w:addDays(monday,-7)})}><Icon name="left" /></button>
      <h2 className="weeknav__label">{weekLabel(monday)}</h2>
      <button type="button" className="icon-btn" aria-label="다음 주" onClick={() => setParams({w:addDays(monday,7)})}><Icon name="right" /></button>
    </div>
    <nav className="stack" aria-label="날짜별 편지">
      {weekDays(monday).map(d => <Link className="day-row" key={d} to={`/day/${d}`}><span className="day-row__text"><strong>{dayFull(d)}</strong><span className="muted small"> {mmdd(d)}</span></span><span>편지 읽기</span><Icon name="right" /></Link>)}
    </nav>
    <Link className="btn btn--ghost" to={`/share/${monday}`}>주일 모임 · 월요일부터 함께 읽기</Link>
    <p className="muted small">하루의 편지를 다 읽으면 다음 날짜로 이어집니다.</p>
    <footer className="row-wrap"><span className="muted small">{me?.name}님으로 참여 중</span><button type="button" className="link-btn small" onClick={() => { if(confirm('이 기기에서 나갈까요?')) void leave() }}>나가기</button></footer>
  </main></div>
}
