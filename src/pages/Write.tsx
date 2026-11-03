import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { deleteEntry, fetchMyEntry, removePhoto, saveEntry, signedUrls, uploadPhoto, type Entry } from '../lib/api'
import { addDays, dayName, defaultWriteDate, isISODate, mmdd, weekDays, weekLabel, weekStartFor } from '../lib/date'
import { compressPhoto, formatBytes } from '../lib/image'
import { useSession } from '../session'
import { ErrorNote, Icon, TopBar } from '../components/ui'

export default function Write() {
  const { me } = useSession()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('date')
  const date = isISODate(q) ? q : defaultWriteDate()
  const monday = weekStartFor(date)

  const [existing, setExisting] = useState<Entry | null>(null)
  const [label, setLabel] = useState('')
  const [body, setBody] = useState('')
  const [keptPhoto, setKeptPhoto] = useState<string | null>(null) // 이미 올라가 있는 사진 경로
  const [keptUrl, setKeptUrl] = useState<string | null>(null)
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [sizeNote, setSizeNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 날짜가 바뀌면 그 날 내 답장을 불러옴
  useEffect(() => {
    if (!me) return
    let alive = true
    setBusy('불러오는 중…')
    setError(null)
    setNewFile(null)
    setNewUrl(null)
    setSizeNote(null)
    fetchMyEntry(me.id, date)
      .then(async (e) => {
        if (!alive) return
        setExisting(e)
        setLabel(e?.letter_label ?? '')
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
  }, [me, date])

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

  const previewUrl = newUrl ?? keptUrl
  const hasPhoto = !!newFile || !!keptPhoto
  const canSave = !busy && (hasPhoto || body.trim().length > 0)

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
      await saveEntry({
        member_id: me.id,
        entry_date: date,
        letter_label: label.trim() || null,
        body: body.trim(),
        photo_path: photoPath,
      })
      // 바뀌었거나 빠진 예전 사진은 정리
      if (existing?.photo_path && existing.photo_path !== photoPath) await removePhoto(existing.photo_path)
      nav(`/day/${date}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(null)
    }
  }

  async function onDelete() {
    if (!existing || !confirm('이 날 답장을 지울까요?')) return
    setBusy('지우는 중…')
    try {
      await deleteEntry(existing.id)
      if (existing.photo_path) await removePhoto(existing.photo_path)
      nav(`/day/${date}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(null)
    }
  }

  const setDate = (d: string) => setParams({ date: d })

  return (
    <div className="page">
      <form className="container narrow stack write" onSubmit={onSubmit}>
        <TopBar back={`/?w=${monday}`} sub={`${mmdd(date)} ${dayName(date)}요일`} title={existing ? '답장 고치기' : '오늘의 답장'} />

        <fieldset className="stack-xs plain">
          <legend className="field-label">어느 날 편지인가요?</legend>
          <div className="weekpick">
            <button type="button" className="icon-btn" aria-label="지난 주" onClick={() => setDate(addDays(monday, -7))}>
              <Icon name="left" />
            </button>
            <div className="chips">
              {weekDays(monday).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={d === date ? 'chip is-on' : 'chip'}
                  aria-pressed={d === date}
                  onClick={() => setDate(d)}
                >
                  <span>{dayName(d)}</span>
                  <span className="chip__sub">{mmdd(d)}</span>
                </button>
              ))}
            </div>
            <button type="button" className="icon-btn" aria-label="다음 주" onClick={() => setDate(addDays(monday, 7))}>
              <Icon name="right" />
            </button>
          </div>
          <span className="muted small center">{weekLabel(monday)}</span>
        </fieldset>

        <div className="stack-xs">
          <span className="field-label">편지 사진</span>
          {previewUrl ? (
            <div className="photo-preview">
              <img src={previewUrl} alt="올릴 편지 사진 미리보기" />
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
        </div>

        <div className="stack-xs">
          <label htmlFor="label" className="field-label">
            편지 번호나 제목 <span className="muted">(선택)</span>
          </label>
          <input id="label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: No. 41" />
        </div>

        <div className="stack-xs">
          <label htmlFor="body" className="field-label">
            한 줄 메모 {hasPhoto && <span className="muted">(선택)</span>}
          </label>
          <textarea
            id="body"
            className="input textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={hasPhoto ? 3 : 8}
            placeholder={hasPhoto ? '사진에 덧붙이고 싶은 말이 있다면' : '사진 대신 바로 답장을 써도 돼요'}
          />
        </div>

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
