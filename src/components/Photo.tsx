import { useState } from 'react'
import { signedUrls } from '../lib/api'

export function Photo({path, src, alt, onOpen, className}: {path:string; src?:string; alt:string; onOpen?:()=>void; className?:string}) {
  const [override, setOverride] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const url = override ?? src
  async function retry() {
    setBusy(true)
    try { const result = await signedUrls([path], true); if (!result[path]) throw Error(); setOverride(result[path]); setFailed(false) }
    catch { setFailed(true) } finally { setBusy(false) }
  }
  if (!url || failed) return <div className="photo-retry"><span>{failed ? '사진을 불러오지 못했어요.' : '사진을 준비하고 있어요.'}</span><button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void retry()}>{busy ? '불러오는 중…' : '사진 다시 불러오기'}</button></div>
  const img = <img decoding="async" src={url} alt={alt} onError={() => setFailed(true)} />
  return onOpen ? <button type="button" className={className} onClick={onOpen} aria-label={`${alt} 전체 화면으로 보기`}>{img}</button> : img
}
