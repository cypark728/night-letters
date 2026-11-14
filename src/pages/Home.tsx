import { Link, useSearchParams } from 'react-router-dom'
import { LETTERS, addDays, currentLetter, letterForDate, letterGroup, mmdd, weekLabel } from '../lib/date'
import { useSession } from '../session'
import { Icon } from '../components/ui'

export default function Home() {
  const { me, leave } = useSession()
  const [params, setParams] = useSearchParams()
  const current = currentLetter()
  const selected = letterForDate(params.get('w') ?? undefined) ?? current
  const group = letterGroup(selected.date)
  const monday = group[0].date
  const previous = addDays(monday, -7)
  const next = addDays(monday, 7)
  return <div className="page"><main className="container narrow stack pad">
    <span className="brand">하나님의 밤편지</span>
    <h1 className="display">하루 한 장,<br />함께 읽는 마음.</h1>
    <p className="soft">늦게 쓴 편지도 그날에 모여 있어요.</p>
    <div className="row-wrap">
      <Link className="btn btn--primary grow" to={`/day/${current.date}`}>오늘 편지 읽기</Link>
      <Link className="btn btn--ghost grow" to={`/write?date=${current.date}`}>내 답장 쓰기</Link>
    </div>
    <div className="weeknav">
      <button type="button" className="icon-btn" aria-label="지난주" disabled={!letterForDate(previous)} onClick={() => setParams({w:previous})}><Icon name="left" /></button>
      <h2 className="weeknav__label">{weekLabel(monday)}</h2>
      <button type="button" className="icon-btn" aria-label="다음 주" disabled={!letterForDate(next)} onClick={() => setParams({w:next})}><Icon name="right" /></button>
    </div>
    <nav className="stack" aria-label="이번 주 편지">
      {group.map(l => <Link className="day-row" key={l.number} to={`/day/${l.date}`}><span className="day-row__text"><strong>{l.title}</strong><span className="muted small">{mmdd(l.date)}</span></span><span>편지 읽기</span><Icon name="right" /></Link>)}
    </nav>
    <Link className="btn btn--ghost" to={`/share/${monday}`}>주일 모임 · 이번 주 함께 읽기</Link>
    <p className="muted small">{group[0].number}~{group.at(-1)?.number}번째 편지를 순서대로 읽어요. 전체 {LETTERS.length}편</p>
    <footer className="row-wrap"><span className="muted small">{me?.name}님으로 참여 중</span><button type="button" className="link-btn small" onClick={() => { if(confirm('이 기기에서 나갈까요?')) void leave() }}>로그아웃 · 이름 다시 선택</button></footer>
  </main></div>
}
