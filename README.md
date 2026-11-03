# 밤편지 나눔 (night-letters)

교회 소모임 6명이 '하나님의 밤편지'를 하루에 한 통씩 읽고 답장을 나누는 웹앱입니다.
월~금은 각자 답장(편지 사진 + 한 줄 메모)을 올리고, 주일에는 요일별로 한 사람씩 넘겨보며 나눕니다.

- 폰, 아이패드, PC 어디서든 같은 주소로 접속 (반응형 웹, 홈 화면에 추가 가능)
- 카톡방에 공유한 **모임 코드**와 **이름 선택**만으로 들어오기 (가입이나 비밀번호 없음)
- 사진은 올리기 전에 자동으로 줄여서 저장 (긴 쪽 2000px, 장당 약 300~500KB)

기술 스택: Vite + React + TypeScript · Supabase (DB, 익명 로그인, Storage) · Vercel

---

## 1. Supabase 준비 (약 10분)

1. https://supabase.com 에서 새 프로젝트를 만듭니다. Region은 `Northeast Asia (Seoul)`를 추천합니다.
2. **Authentication > Sign In / Providers**에서 **Allow anonymous sign-ins**를 켭니다.
3. **SQL Editor**에서 `supabase/schema.sql` 내용을 붙여넣습니다. 실행하기 전에 맨 아래 두 곳을 수정하세요.
   - `여기에-모임코드` → 카톡방에만 공유할 모임 코드
   - `이름1` ~ `이름6` → 실제 멤버 이름 (`sort` 값이 화면에 나오는 순서)
4. **Project Settings > API**에서 `Project URL`과 `anon public` 키(또는 `publishable` 키)를 복사합니다.

> 멤버를 추가하거나 모임 코드를 바꾸려면 Table Editor에서 `members`, `app_config` 테이블을 고치면 됩니다.

## 2. 로컬 실행

```bash
npm install
cp .env.example .env.local      # Windows PowerShell: copy .env.example .env.local
# .env.local 에 URL과 키 붙여넣기
npm run dev
```

브라우저에서 http://localhost:5173 을 열고 모임 코드를 넣은 뒤 이름을 고르면 됩니다.
같은 와이파이의 폰으로 확인하려면 `npm run dev -- --host` 로 실행하세요.

## 3. 배포 (Vercel)

1. 이 폴더를 GitHub 저장소로 올립니다.
2. https://vercel.com 에서 **Add New > Project**로 저장소를 가져옵니다. Framework는 Vite로 자동 인식됩니다.
3. **Environment Variables**에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 넣고 Deploy 합니다.
4. 나온 주소와 모임 코드를 카톡방에 공지하면 끝입니다.

`vercel.json`은 `/day/...` 같은 주소로 새로고침해도 404가 나지 않게 해 줍니다.

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 이번 주 현황 (요일 × 사람 표, 요일별 카드). 주일에 열면 지난 월~금을 보여줌 |
| `/day/:date` | 그날 답장 모아보기 + 아직 안 쓴 사람 |
| `/share/:date` | 나눔 모드. 한 사람씩 크게 (아이패드/PC는 왼쪽에 사람 목록, ← → 키 지원) |
| `/write?date=` | 답장 쓰기/고치기. 사진 업로드(자동 압축), 편지 번호, 한 줄 메모 |

## 보안 구조

- 기기마다 Supabase **익명 로그인**을 하고, `join_group(모임코드, 멤버)` RPC로 그 기기를 멤버에 연결합니다.
- 모임 코드는 `app_config` 테이블에 있고, RLS 정책이 없어서 앱에서 직접 읽을 수 없습니다.
- 연결된 기기만 답장과 사진을 볼 수 있고(RLS), 수정과 삭제는 본인 답장만 가능합니다.
- 사진 버킷은 비공개이고, 1시간짜리 서명 URL로만 보입니다.
- 링크와 모임 코드를 모두 아는 사람은 아무 이름으로나 들어올 수 있습니다. 6명 소모임에 맞춘 수준의 보안이니, 코드가 밖으로 새면 `app_config`에서 바꿔 주세요.

## 무료 한도 참고

- Supabase 무료 플랜: Storage 약 1GB, 전송량 월 5GB 수준 (요금 정책은 바뀔 수 있으니 공식 페이지에서 확인하세요)
- 6명이 하루 한 장씩 올리면 1년에 약 1,560장, 0.5~0.7GB 정도입니다.
- 일주일 동안 접속이 없으면 프로젝트가 일시정지되니, 쉬는 기간 뒤에는 대시보드에서 Restore 하세요.

## 폴더 구조

```
supabase/schema.sql      DB, RLS, Storage 정책, 초기 데이터
src/lib/                 supabase 클라이언트, API, 날짜 계산, 사진 압축
src/session.tsx          로그인과 멤버 상태
src/pages/               Join, Home, Day, Share, Write
src/components/          공통 UI, 답장 카드
src/styles.css           디자인 토큰과 전체 스타일
public/                  아이콘, PWA manifest
```
