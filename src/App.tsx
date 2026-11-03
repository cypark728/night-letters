import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { SessionProvider, useSession } from './session'
import { ErrorNote, Loading } from './components/ui'
import Join from './pages/Join'
import Home from './pages/Home'
import Day from './pages/Day'
import Share from './pages/Share'
import Write from './pages/Write'

function Gate() {
  const { status, error, refresh } = useSession()
  if (status === 'loading') return <Loading label="밤편지를 여는 중…" />
  if (status === 'error')
    return (
      <main className="container narrow stack pad">
        <ErrorNote message={error ?? '연결에 문제가 있어요.'} />
        <button type="button" className="btn btn--ghost" onClick={() => void refresh()}>
          다시 시도
        </button>
      </main>
    )
  if (status === 'need-join') return <Join />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/day/:date" element={<Day />} />
      <Route path="/share/:date" element={<Share />} />
      <Route path="/write" element={<Write />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  if (!isConfigured)
    return (
      <main className="container narrow stack pad">
        <h1 className="display display--md">설정이 필요해요</h1>
        <p className="soft">
          <code>.env.local</code> 에 <code>VITE_SUPABASE_URL</code> 과 <code>VITE_SUPABASE_ANON_KEY</code> 를 넣어 주세요. (README 참고)
        </p>
      </main>
    )
  return (
    <BrowserRouter>
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </BrowserRouter>
  )
}
