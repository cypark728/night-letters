import { useEffect, useState } from 'react'
import { signedUrls, type Entry, type Member } from './api'

/** 비동기 로더: deps 가 바뀌면 다시 불러옴 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    load()
      .then((v) => alive && setData(v))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading }
}

export function usePhotoUrls(entries: Entry[] | null) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const key = (entries ?? []).map((e) => e.photo_path ?? '').join('|')
  useEffect(() => {
    const paths = (entries ?? []).map((e) => e.photo_path).filter((p): p is string => !!p)
    if (paths.length === 0) return
    let alive = true
    signedUrls(paths)
      .then((m) => alive && setUrls((prev) => ({ ...prev, ...m })))
      .catch(() => {})
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return urls
}

/** 멤버 순서대로 정렬된 답장 */
export function sortByMembers(entries: Entry[], members: Member[]): Entry[] {
  const order = new Map(members.map((m, i) => [m.id, i]))
  return [...entries].sort((a, b) => (order.get(a.member_id) ?? 99) - (order.get(b.member_id) ?? 99))
}

/** 그날 가장 많이 적힌 편지 번호/제목 */
export function commonLabel(entries: Entry[]): string | null {
  const count = new Map<string, number>()
  for (const e of entries) {
    const l = e.letter_label?.trim()
    if (l) count.set(l, (count.get(l) ?? 0) + 1)
  }
  let best: string | null = null
  let n = 0
  for (const [l, c] of count) if (c > n) [best, n] = [l, c]
  return best
}
