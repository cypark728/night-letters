import { Link, useSearchParams } from 'react-router-dom'
import { fetchWeek, type Entry } from '../lib/api'
import { addDays, dayName, isISODate, mmdd, sundayLabel, todayISO, weekDays, weekLabel, weekStartFor } from '../lib/date'
import { commonLabel, useLoad } from '../lib/hooks'
import { useSession } from '../session'
import { ErrorNote, Icon, Loading } from '../components/ui'

export default function Home() {
  const { me, members, leave } = useSession()
  const [params, setParams] = useSearchParams()
  const w = params.get('w')
  const monday = weekStartFor(isISODate(w) ? w : todayISO())
  const days = weekDays(monday)
  const { data, error, loading } = useLoad(() => fetchWeek(monday), [monday])

  const entries = data ?? []
  const byDay = new Map<string, Entry[]>(days.map((d) => [d, []]))
  for (const e of entries) byDay.get(e.entry_date)?.push(e)
  const has = new Set(entries.map((e) => `${e.member_id}|${e.entry_date}`))
  const total = members.length * 5
  const pct = total ? Math.round((entries.length / total) * 100) : 0

  const go = (delta: number) => setParams({ w: addDays(monday, delta * 7) })

  return (
    <div className="page">
      <header className="appbar">
        <div className="appbar__inner">
          <span className="brand">밤편지 나눔</span>
          <div className="weeknav">
            <button type="button" className="icon-btn" aria-label="지난 주" onClick={() => go(-1)}>
              <Icon name="left" />
            </button>
            <span className="weeknav__label">{weekLabel(monday)}</span>
            <button type="button" className="icon-btn" aria-label="다음 주" onClick={() => go(1)}>
              <Icon name="right" />
            </button>
          </div>
          <Link to="/write" className="btn btn--primary btn--sm">
            <Icon name="pen" size={18} /> 답장 쓰기
          </Link>
        </div>
      </header>

      <main className="container home">
        <section className="home__side stack">
          <div className="stack-xs">
            <span className="muted small">
              {weekLabel(monday)} · 함께하는 {members.length}명
            </span>
            <h1 className="display">주일 나눔</h1>
            <span className="soft">{sundayLabel(monday)}</span>
          </div>

          <div className="card progress">
            <div className="progress__row">
              <span className="soft">이번 주 답장</span>
              <span className="progress__num">
                {entries.length} <span className="muted">/ {total}</span>
              </span>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="이번 주 답장 비율">
              <div className="bar__fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="card grid-card">
            <table className="status-table">
              <caption className="muted small">누가 언제 썼는지</caption>
              <thead>
                <tr>
                  <th scope="col"></th>
                  {days.map((d) => (
                    <th scope="col" key={d}>
                      {dayName(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className={m.id === me?.id ? 'is-me' : undefined}>
                    <th scope="row">{m.name}</th>
                    {days.map((d) => {
                      const ok = has.has(`${m.id}|${d}`)
                      return (
                        <td key={d}>
                          <span className={ok ? 'dot dot--on' : 'dot'} role="img" aria-label={ok ? '답장함' : '답장 전'} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="home__main stack" aria-label="요일별 편지">
          <p className="muted small">요일을 눌러 그날 답장을 모아보세요</p>
          {error && <ErrorNote message={error} />}
          {loading && !data ? (
            <Loading />
          ) : (
            days.map((d) => {
              const list = byDay.get(d) ?? []
              const label = commonLabel(list)
              return (
                <Link key={d} to={`/day/${d}`} className="day-row">
                  <span className="day-row__badge">{dayName(d)}</span>
                  <span className="day-row__text">
                    <span className="muted small">
                      {mmdd(d)} {dayName(d)}요일
                    </span>
                    <span className="day-row__title">{label ?? (list.length ? '편지 번호 미입력' : '아직 답장이 없어요')}</span>
                  </span>
                  <span className="day-row__meta">
                    <span className="dots" aria-hidden="true">
                      {members.map((m) => (
                        <span key={m.id} className={has.has(`${m.id}|${d}`) ? 'mini mini--on' : 'mini'} />
                      ))}
                    </span>
                    <span className="small soft">
                      {list.length} / {members.length}
                    </span>
                  </span>
                  <Icon name="right" size={16} />
                </Link>
              )
            })
          )}
        </section>
      </main>

      <footer className="container footer">
        <span className="muted small">{me?.name} 님으로 들어와 있어요</span>
        <button
          type="button"
          className="link-btn small"
          onClick={() => {
            if (confirm('이 기기에서 나가고 다른 이름으로 들어갈까요?')) void leave()
          }}
        >
          다른 이름으로 들어가기
        </button>
      </footer>
    </div>
  )
}
