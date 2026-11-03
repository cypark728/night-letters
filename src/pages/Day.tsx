import { Link, Navigate, useParams } from 'react-router-dom'
import { fetchDay } from '../lib/api'
import { dayFull, isISODate, mmdd, weekStartFor } from '../lib/date'
import { commonLabel, sortByMembers, useLoad, usePhotoUrls } from '../lib/hooks'
import { useSession } from '../session'
import { MissingCard, ReplyCard } from '../components/ReplyCard'
import { ErrorNote, Icon, Loading, TopBar } from '../components/ui'

export default function Day() {
  const { date } = useParams()
  const { me, members, memberById } = useSession()
  const valid = isISODate(date)
  const { data, error, loading } = useLoad(() => (valid ? fetchDay(date) : Promise.resolve([])), [date])
  const entries = sortByMembers(data ?? [], members)
  const urls = usePhotoUrls(data)
  if (!valid) return <Navigate to="/" replace />

  const done = new Set(entries.map((e) => e.member_id))
  const missing = members.filter((m) => !done.has(m.id))
  const label = commonLabel(entries)

  return (
    <div className="page">
      <main className="container stack day">
        <TopBar back={`/?w=${weekStartFor(date)}`} sub="이번 주" />
        <div className="stack-xs">
          <span className="muted small">
            {mmdd(date)} {dayFull(date)} · {entries.length}명 답장
          </span>
          <h1 className="display display--md">{label ?? `${dayFull(date)} 편지`}</h1>
        </div>

        <div className="row-wrap">
          {entries.length > 0 && (
            <Link to={`/share/${date}`} className="btn btn--primary grow">
              <Icon name="cards" /> 한 장씩 넘겨보며 나누기
            </Link>
          )}
          {me && !done.has(me.id) && (
            <Link to={`/write?date=${date}`} className="btn btn--ghost grow">
              <Icon name="pen" /> 이 날 답장 쓰기
            </Link>
          )}
        </div>

        {error && <ErrorNote message={error} />}
        {loading && !data ? (
          <Loading />
        ) : (
          <div className="reply-grid">
            {entries.map((e) => (
              <ReplyCard
                key={e.id}
                entry={e}
                member={memberById[e.member_id]}
                photoUrl={e.photo_path ? urls[e.photo_path] : undefined}
                mine={e.member_id === me?.id}
              />
            ))}
            {missing.map((m) => (
              <MissingCard key={m.id} name={m.name} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
