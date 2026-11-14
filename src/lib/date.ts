// 날짜는 모두 사용자 기기의 로컬 시간 기준 'YYYY-MM-DD' 문자열로 다룹니다.

export const DAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'] as const
const NTH = ['첫째', '둘째', '셋째', '넷째', '다섯째']

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isISODate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime()) && toISO(parseISO(s)) === s
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function todayISO(): string {
  return toISO(new Date())
}

/**
 * 그 날짜가 속한 '나눔 주간'의 월요일.
 * 월~토는 같은 주 월요일, 일요일(주일)은 바로 전 주 월요일 → 주일엔 지난 월~금을 나눕니다.
 */
export function weekStartFor(iso: string): string {
  const day = parseISO(iso).getDay()
  const back = day === 0 ? 6 : day - 1
  return addDays(iso, -back)
}

export function weekDays(monday: string): string[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i))
}

export function isWeekday(iso: string): boolean {
  const d = parseISO(iso).getDay()
  return d >= 1 && d <= 5
}

/** 답장 쓰기 기본 날짜: 평일이면 오늘, 주말이면 그 주 금요일 */
export function defaultWriteDate(): string {
  const t = todayISO()
  return isWeekday(t) ? t : addDays(weekStartFor(t), 4)
}

export function weekLabel(monday: string): string {
  const d = parseISO(monday)
  const nth = Math.floor((d.getDate() - 1) / 7)
  return `${d.getMonth() + 1}월 ${NTH[nth]} 주`
}

export function sundayLabel(monday: string): string {
  const d = parseISO(addDays(monday, 6))
  return `${d.getMonth() + 1}월 ${d.getDate()}일 주일`
}

export function mmdd(iso: string): string {
  const d = parseISO(iso)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

export function dayName(iso: string): string {
  return DAY_SHORT[parseISO(iso).getDay()]
}

export function dayFull(iso: string): string {
  return `${dayName(iso)}요일`
}

/** created_at → "월 23:12" */
export function stamp(ts: string): string {
  const d = new Date(ts)
  return `${DAY_SHORT[d.getDay()]} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Storage remains date-based so previously uploaded replies keep their identity.
const ORDINALS = ['첫','두','세','네','다섯','여섯','일곱','여덟','아홉','열','열한','열두','열세','열네','열다섯','열여섯','열일곱','열여덟','열아홉','스무','스물한','스물두','스물세','스물네','스물다섯','스물여섯','스물일곱','스물여덟','스물아홉','서른']
export const LETTERS = Array.from({ length: 30 }, (_, index) => {
  const offset = index - 10
  const weeks = Math.floor(offset / 5)
  const weekday = ((offset % 5) + 5) % 5
  return { number: index + 1, date: addDays('2026-11-09', weeks * 7 + weekday), title: `${ORDINALS[index]} 번째 편지` }
})
export function letterForDate(date: string | undefined) { return LETTERS.find(l => l.date === date) }
export function currentLetter() {
  return LETTERS.filter(l => l.date <= todayISO()).at(-1) ?? LETTERS[0]
}
export function letterTitle(date: string) { return letterForDate(date)?.title ?? '편지' }
export function letterGroup(date: string) {
  const n = letterForDate(date)?.number ?? currentLetter().number
  return LETTERS.slice(Math.floor((n - 1) / 5) * 5, Math.floor((n - 1) / 5) * 5 + 5)
}
export function nextLetter(date: string) {
  const n = letterForDate(date)?.number
  return n ? LETTERS[n] : undefined
}
