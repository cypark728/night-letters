import { supabase } from './supabase'
import { addDays } from './date'

export interface Member {
  id: string
  name: string
}

export interface Entry {
  id: string
  member_id: string
  entry_date: string
  letter_label: string | null
  body: string
  photo_path: string | null
  created_at: string
  updated_at: string
}

const ENTRY_COLS = 'id, member_id, entry_date, letter_label, body, photo_path, created_at, updated_at'

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

/** 로그인 세션이 없으면 익명 로그인 (기기마다 한 번) */
export async function ensureSession(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  fail(error)
}

/** 이 기기가 연결된 멤버 (없으면 null) */
export async function fetchMyMemberId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('current_member_id')
  fail(error)
  return (data as string | null) ?? null
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('id, name').order('sort').order('name')
  fail(error)
  return data ?? []
}

export async function membersForCode(code: string): Promise<Member[]> {
  const { data, error } = await supabase.rpc('list_members', { p_code: code })
  if (error) {
    if (error.message.includes('invalid_code')) throw new Error('모임 코드가 맞지 않아요.')
    throw new Error(error.message)
  }
  return (data as Member[]) ?? []
}

export async function joinGroup(code: string, memberId: string): Promise<void> {
  const { error } = await supabase.rpc('join_group', { p_code: code, p_member: memberId })
  fail(error)
}

/** 이 기기 연결 해제 (다른 이름으로 다시 들어가기) */
export async function leaveDevice(): Promise<void> {
  await supabase.auth.signOut()
}

export async function fetchRange(from: string, to: string): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select(ENTRY_COLS)
    .gte('entry_date', from)
    .lte('entry_date', to)
  fail(error)
  return (data as Entry[]) ?? []
}

export const fetchWeek = (monday: string) => fetchRange(monday, addDays(monday, 4))
export const fetchDay = (date: string) => fetchRange(date, date)

export async function fetchMyEntry(memberId: string, date: string): Promise<Entry | null> {
  const { data, error } = await supabase
    .from('entries')
    .select(ENTRY_COLS)
    .eq('member_id', memberId)
    .eq('entry_date', date)
    .maybeSingle()
  fail(error)
  return (data as Entry | null) ?? null
}

export interface EntryInput {
  member_id: string
  entry_date: string
  letter_label: string | null
  body: string
  photo_path: string | null
}

export async function saveEntry(input: EntryInput): Promise<void> {
  const { error } = await supabase.from('entries').upsert(input, { onConflict: 'member_id,entry_date' })
  fail(error)
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  fail(error)
}

export async function uploadPhoto(memberId: string, date: string, file: File): Promise<string> {
  const path = `${memberId}/${date}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('photos').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  fail(error)
  return path
}

export async function removePhoto(path: string): Promise<void> {
  await supabase.storage.from('photos').remove([path])
}

/** 비공개 사진을 1시간짜리 서명 URL로 */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))]
  if (unique.length === 0) return {}
  const { data, error } = await supabase.storage.from('photos').createSignedUrls(unique, 60 * 60)
  fail(error)
  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl
  }
  return map
}
