import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { downloadPhotoForShare } from '../lib/api'
import { replyShareData, shareReply } from '../lib/shareReply'

export interface ShareableReply {
  body: string
  photoPath: string | null
  file?: File
}

export function ReplyShareDialog({ reply, saved = false, onDone }: { reply: ShareableReply; saved?: boolean; onDone: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const sending = useRef(false)
  const [file, setFile] = useState<File | undefined>(reply.file)
  const [preparing, setPreparing] = useState(!!reply.photoPath && !reply.file)
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  const [prepareError, setPrepareError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const isPhoto = !!reply.photoPath
  const unsupported = typeof navigator.share !== 'function' || (isPhoto && file && (!navigator.canShare || !navigator.canShare({ files: [file] })))

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [])

  useEffect(() => {
    if (!reply.photoPath || reply.file || typeof navigator.share !== 'function') { setPreparing(false); return }
    let alive = true
    setPreparing(true)
    setPrepareError(false)
    void downloadPhotoForShare(reply.photoPath).then(value => { if (alive) setFile(value) }).catch(() => {
      if (alive) { setPrepareError(true); setMessage('사진을 준비하지 못했어요. 다시 시도해 주세요.') }
    }).finally(() => { if (alive) setPreparing(false) })
    return () => { alive = false }
  }, [reply.photoPath, reply.file, attempt])

  function send() {
    if (sending.current || preparing || prepareError || (isPhoto && !file)) return
    sending.current = true
    setSharing(true)
    setMessage('')
    // No fetch/await before share(): preserve the browser's user activation.
    void shareReply(replyShareData(reply.body, isPhoto ? file : undefined)).then(result => {
      if (result === 'closed') {
        onDone()
        return
      }
      setMessage(result === 'cancelled' ? '공유를 취소했어요. 답장은 그대로 저장되어 있어요.' : '이 브라우저에서는 이 내용의 공유를 지원하지 않아요.')
    }).catch(() => setMessage('공유 창을 열지 못했어요. 다시 시도하거나 다른 브라우저에서 열어 주세요.')).finally(() => {
      sending.current = false
      setSharing(false)
    })
  }

  async function copy() {
    try { await navigator.clipboard.writeText(reply.body); setMessage('본문을 복사했어요. 카카오톡에 붙여넣어 주세요.') }
    catch { setMessage('본문을 복사하지 못했어요. 답장 화면에서 글을 선택해 복사해 주세요.') }
  }

  return createPortal(<dialog ref={dialog} className="reply-share-dialog" aria-labelledby="reply-share-title" onCancel={event => { event.preventDefault(); if (!sending.current) onDone() }}>
    <div className="stack">
      <h2 id="reply-share-title" className="display display--md">{saved ? '답장을 저장했어요' : '답장 내용 공유하기'}</h2>
      <p className="soft">{isPhoto ? '사진 한 장을 그대로 공유해요. 휴대폰에 다시 저장하지 않아요.' : '작성한 본문을 그대로 공유해요.'}</p>
      <p className="muted small">공유 창에서 카카오톡과 보낼 채팅방을 선택해 주세요.</p>
      {message && <p role="status" className="soft">{message}</p>}
      {unsupported ? <p className="soft">이 브라우저에서는 {isPhoto ? '사진' : '내용'} 공유를 지원하지 않아요. {saved && '웹에는 저장되어 있어요.'}</p> : <button type="button" className="btn btn--primary" disabled={preparing || sharing || prepareError} onClick={send}>{preparing ? '사진 준비 중…' : sharing ? '공유 창 여는 중…' : '내용 공유하기'}</button>}
      {prepareError && <button type="button" className="btn btn--ghost" onClick={() => setAttempt(value => value + 1)}>사진 준비 다시 시도</button>}
      {unsupported && !isPhoto && <button type="button" className="btn btn--ghost" onClick={() => void copy()}>본문 복사</button>}
      <button type="button" className="btn btn--ghost" disabled={sharing} onClick={onDone}>완료</button>
    </div>
  </dialog>, document.body)
}
