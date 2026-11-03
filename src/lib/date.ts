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
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime())
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
