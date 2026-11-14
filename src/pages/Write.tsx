import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams, useBlocker } from 'react-router-dom'
import { deleteEntry, fetchMyEntry, removePhoto, saveEntry, signedUrls, uploadPhoto, type Entry } from '../lib/api'
import { addDays, currentLetter, letterForDate, letterTitle, letterGroup, mmdd, weekLabel } from '../lib/date'
import { saveWithPhotoCleanup } from '../lib/saveReply'
import { compressPhoto, formatBytes } from '../lib/image'
import { useSession } from '../session'
import { Photo } from '../components/Photo'
import { ErrorNote, Icon, TopBar } from '../components/ui'

export default function Write() {
  const { me } = useSession()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('date')
  const date = letterForDate(q ?? undefined)?.date ?? currentLetter().date

  const [existing, setExisting] = useState<Entry | null>(null)
  const [body, setBody] = useState('')
  const [keptPhoto, setKeptPhoto] = useState<string | null>(null) // 이미 올라가 있는 사진 경로
  const [keptUrl, setKeptUrl] = useState<string | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [sizeNote, setSizeNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [loadedDate, setLoadedDate] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const bypass = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 날짜가 바뀌면 그 날 내 답장을 불러옴
  useEffect(() => {
    if (!me) return
    let alive = true
    setBusy('불러오는 중…')
    setError(null)
    setLoadedDate(null)
    setExisting(null)
    setBody('')
    setKeptPhoto(null)
    setKeptUrl(null)
    setNewFile(null)
    setNewUrl(null)
    setSizeNote(null)
    fetchMyEntry(me.id, date)
      .then(async (e) => {
        if (!alive) return
        setLoadedDate(date)
        setExisting(e)
        setBody(e?.body ?? '')
        setKeptPhoto(e?.photo_path ?? null)
        setKeptUrl(null)
        if (e?.photo_path) {
          const m = await signedUrls([e.photo_path])
          if (alive) setKeptUrl(m[e.photo_path] ?? null)
        }
      })
      .catch((err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setBusy(null))
    return () => {
      alive = false
    }
  }, [me, date, loadAttempt])

  useEffect(() => () => {
    if (newUrl) URL.revokeObjectURL(newUrl)
  }, [newUrl])

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setError(null)
    setBusy('사진 줄이는 중…')
    try {
      const c = await compressPhoto(f)
      setNewFile(c.file)
      setNewUrl(URL.createObjectURL(c.file))
      setSizeNote(`${formatBytes(c.originalBytes)} → ${formatBytes(c.bytes)}`)
    } catch (err) {
      setError('사진을 읽지 못했어요. 다른 사진으로 해 볼까요?')
      console.error(err)
    } finally {
      setBusy(null)
    }
  }

  function clearPhoto() {
    setNewFile(null)
    setNewUrl(null)
    setSizeNote(null)
    setKeptPhoto(null)
    setKeptUrl(null)
  }

  const hasPhoto = !!newFile || !!keptPhoto
  const canSave = loadedDate === date && !busy && (hasPhoto || body.trim().length > 0)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!me || !canSave) return
    setError(null)
    try {
      let photoPath = keptPhoto
      if (newFile) {
        setBusy('사진 올리는 중…')
        photoPath = await uploadPhoto(me.id, date, newFile)
      }
      setBusy('저장하는 중…')
      await saveWithPhotoCleanup({
        member_id: me.id,
        entry_date: date,
        letter_label: letterTitle(date),
        body: body.trim(),
        photo_path: photoPath,
      }, existing?.photo_path ?? null, {save:saveEntry, remove:removePhoto})
      bypass.current = true
      nav(`/day/${date}`)
    } catch {
      // An unsuccessful response does not prove the database write failed.
      // Keep the uploaded object to avoid deleting a photo that was committed.
      setError('저장 결과를 확인하지 못했어요. 입력 내용은 유지됩니다. 다시 저장해 주세요.')
      setBusy(null)
    }
  }

  async function onDelete() {
    if (!existing || !confirm('이 날 답장을 지울까요?')) return
    setBusy('지우는 중…')
    try {
      await deleteEntry(existing.id)
      if (existing.photo_path) { try { await removePhoto(existing.photo_path) } catch { /* Reply has already been deleted. */ } }
      bypass.current = true
      nav(`/day/${date}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(null)
    }
  }

  const dirty = loadedDate === date && (body !== (existing?.body ?? '') || !!newFile || keptPhoto !== (existing?.photo_path ?? null))
  const blocker = useBlocker(() => !bypass.current && (dirty || !!busy && loadedDate === date))
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (busy) { blocker.reset(); return }
      if (confirm('저장하지 않은 내용이 있어요. 이동할까요?')) blocker.proceed()
      else blocker.reset()
    }
  }, [blocker, busy])
  useEffect(() => {
    const protect = (e: BeforeUnloadEvent) => { if (dirty || busy && loadedDate === date) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty, busy, loadedDate, date])
  const setDate = (d: string) => { if (!busy && d !== date) setParams({date:d}) }

  return (
    <div className="page">
      <form className="container narrow stack write" onSubmit={onSubmit}>
        <TopBar back={`/day/${date}`} sub={letterTitle(date)} title={existing ? '답장 수정' : '답장 쓰기'} />

        <p className="soft">{me?.name}님의 {letterTitle(date)} 답장</p>
        {loadedDate !== date && !busy && <button type="button" className="btn btn--ghost" onClick={() => setLoadAttempt(v => v + 1)}>기존 답장 다시 불러오기</button>}
        <fieldset className="stack-xs plain" disabled={!!busy}>
          <legend className="field-label">어느 편지의 답장인가요?</legend>
          <div className="weekpick">
            <button type="button" className="icon-btn" aria-label="지난주" disabled={!letterForDate(addDays(letterGroup(date)[0].date,-7))} onClick={() => setDate(addDays(letterGroup(date)[0].date,-7))}><Icon name="left" /></button>
            <div className="chips">{letterGroup(date).map(l => <button key={l.number} type="button" className={l.date === date ? 'chip is-on' : 'chip'} aria-pressed={l.date === date} onClick={() => setDate(l.date)} aria-label={l.title}><span>{l.number}번째</span><span className="chip__sub">{mmdd(l.date)}</span></button>)}</div>
            <button type="button" className="icon-btn" aria-label="다음 주" disabled={!letterForDate(addDays(letterGroup(date)[0].date,7))} onClick={() => setDate(addDays(letterGroup(date)[0].date,7))}><Icon name="right" /></button>
          </div>
          <span className="muted small center">{weekLabel(letterGroup(date)[0].date)}</span>
        </fieldset>

        <fieldset className="stack-xs plain" disabled={!!busy || loadedDate !== date}>
          <span className="field-label">편지 사진</span>
          {hasPhoto ? (
            <div className="photo-preview">
              {newUrl ? <img src={newUrl} alt="새 답장 사진 미리보기" /> : keptPhoto && <Photo key={keptPhoto} path={keptPhoto} src={keptUrl ?? undefined} alt="저장된 답장 사진" />}
              <div className="photo-preview__actions">
                <button type="button" className="pill" onClick={() => fileRef.current?.click()}>
                  <Icon name="camera" size={16} /> 다른 사진
                </button>
                <button type="button" className="pill" onClick={clearPhoto}>
                  <Icon name="close" size={16} /> 빼기
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="photo-drop" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size={28} />
              <strong>편지 사진 올리기</strong>
              <span className="muted small">밝은 곳에서, 위에서 수직으로 찍으면 잘 보여요</span>
            </button>
          )}
          {sizeNote && (
            <span className="ok-note small">
              <Icon name="check" size={16} /> 사진을 줄였어요 ({sizeNote})
            </span>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

        </fieldset>

        {!hasPhoto && (
        <div className="stack-xs">
          <label htmlFor="body" className="field-label">
            한 줄 메모 {hasPhoto && <span className="muted">(선택)</span>}
          </label>
          <textarea
            disabled={!!busy || loadedDate !== date}
            id="body"
            className="input textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={hasPhoto ? 3 : 8}
            placeholder={hasPhoto ? '사진에 덧붙이고 싶은 말이 있다면' : '사진 대신 바로 답장을 써도 돼요'}
          />
        </div>
        )}

        {error && <ErrorNote message={error} />}

        <button className="btn btn--primary" disabled={!canSave}>
          {busy ?? (existing ? '고친 내용 저장' : '답장 보내기')}
        </button>
        {existing && (
          <button type="button" className="link-btn danger" onClick={onDelete} disabled={!!busy}>
            이 날 답장 지우기
          </button>
        )}
      </form>
    </div>
  )
}
