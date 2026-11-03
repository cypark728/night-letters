import { useState, type FormEvent } from 'react'
import { joinGroup, membersForCode, type Member } from '../lib/api'
import { useSession } from '../session'
import { Avatar, ErrorNote } from '../components/ui'

export default function Join() {
  const { refresh } = useSession()
  const [code, setCode] = useState('')
  const [list, setList] = useState<Member[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function checkCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setList(await membersForCode(code.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function pick(m: Member) {
    setBusy(true)
    setError(null)
    try {
      await joinGroup(code.trim(), m.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <main className="join">
      <div className="join__inner">
        <h1 className="display">밤편지 나눔</h1>
        <p className="muted">하루 한 통, 편지를 읽고 답장을 나눠요.</p>

        {!list ? (
          <form onSubmit={checkCode} className="stack">
            <label htmlFor="code" className="field-label">
              모임 코드
            </label>
            <input
              id="code"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              placeholder="카톡방에서 받은 코드"
              required
            />
            <button className="btn btn--primary" disabled={busy || !code.trim()}>
              {busy ? '확인 중…' : '들어가기'}
            </button>
          </form>
        ) : (
          <div className="stack">
            <p className="field-label">이름을 골라 주세요</p>
            <div className="name-grid">
              {list.map((m) => (
                <button key={m.id} type="button" className="name-btn" onClick={() => pick(m)} disabled={busy}>
                  <Avatar name={m.name} size={36} />
                  {m.name}
                </button>
              ))}
            </div>
            <p className="muted small">한 번 고르면 이 기기에서는 계속 그 이름으로 들어와요.</p>
          </div>
        )}
        {error && <ErrorNote message={error} />}
      </div>
    </main>
  )
}
