import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ensureSession, fetchMembers, fetchMyMemberId, leaveDevice, type Member } from './lib/api'

type Status = 'loading' | 'need-join' | 'ready' | 'error'

interface SessionValue {
  status: Status
  error: string | null
  me: Member | null
  members: Member[]
  memberById: Record<string, Member>
  refresh: () => Promise<void>
  leave: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<Member | null>(null)
  const [members, setMembers] = useState<Member[]>([])

  const refresh = useCallback(async () => {
    try {
      await ensureSession()
      const myId = await fetchMyMemberId()
      if (!myId) {
        setMe(null)
        setMembers([])
        setStatus('need-join')
        return
      }
      const list = await fetchMembers()
      setMembers(list)
      setMe(list.find((m) => m.id === myId) ?? null)
      setStatus('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [])

  const leave = useCallback(async () => {
    await leaveDevice()
    setStatus('loading')
    await refresh()
  }, [refresh])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <SessionContext.Provider value={{ status, error, me, members, memberById, refresh, leave }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const v = useContext(SessionContext)
  if (!v) throw new Error('SessionProvider missing')
  return v
}
