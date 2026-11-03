-- ============================================================
-- 밤편지 나눔 (night-letters) · Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- 맨 아래 "초기 데이터" 부분의 모임 코드와 이름은 꼭 바꿔 주세요.
-- ============================================================

-- 1) 테이블 -----------------------------------------------------

-- 모임 멤버 (6명)
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);

-- 기기(로그인 세션) ↔ 멤버 연결. 한 사람이 폰/아이패드/PC 여러 기기를 쓸 수 있음
create table if not exists public.member_devices (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  member_id  uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 비공개 설정 (모임 코드). 클라이언트에서 직접 읽을 수 없음
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

-- 하루 한 장의 답장
create table if not exists public.entries (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id) on delete cascade,
  entry_date   date not null,                  -- 편지를 읽은 날 (월~금)
  letter_label text,                           -- 예: "No. 41" 또는 편지 제목 (선택)
  body         text not null default '',       -- 한 줄 메모 / 답장 내용 (선택)
  photo_path   text,                           -- storage: photos/<member_id>/<file>
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (member_id, entry_date),
  constraint entries_has_content check (photo_path is not null or length(trim(body)) > 0)
);

create index if not exists entries_date_idx on public.entries (entry_date);

-- 2) 헬퍼 함수 ---------------------------------------------------

-- 현재 로그인한 기기의 멤버 id (없으면 null)
create or replace function public.current_member_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select member_id from public.member_devices where user_id = auth.uid()
$$;

-- 모임 코드가 맞으면 멤버 이름 목록을 돌려줌 (가입 화면용)
create or replace function public.list_members(p_code text)
returns table (id uuid, name text)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.app_config where key = 'join_code' and value = p_code) then
    raise exception 'invalid_code';
  end if;
  return query select m.id, m.name from public.members m order by m.sort, m.name;
end;
$$;

-- 모임 코드 + 이름 선택으로 이 기기를 멤버에 연결
create or replace function public.join_group(p_code text, p_member uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.app_config where key = 'join_code' and value = p_code) then
    raise exception 'invalid_code';
  end if;
  if not exists (select 1 from public.members where id = p_member) then
    raise exception 'invalid_member';
  end if;
  insert into public.member_devices (user_id, member_id)
  values (auth.uid(), p_member)
  on conflict (user_id) do update set member_id = excluded.member_id;
  return p_member;
end;
$$;

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_touch on public.entries;
create trigger entries_touch before update on public.entries
for each row execute function public.touch_updated_at();

revoke all on function public.list_members(text) from public;
revoke all on function public.join_group(text, uuid) from public;
grant execute on function public.list_members(text) to authenticated;
grant execute on function public.join_group(text, uuid) to authenticated;
grant execute on function public.current_member_id() to authenticated;

-- 3) RLS ---------------------------------------------------------

alter table public.members        enable row level security;
alter table public.member_devices enable row level security;
alter table public.app_config     enable row level security;   -- 정책 없음 = 아무도 직접 못 읽음
alter table public.entries        enable row level security;

drop policy if exists "members: 가입한 사람만 조회" on public.members;
create policy "members: 가입한 사람만 조회" on public.members
  for select to authenticated
  using (public.current_member_id() is not null);

drop policy if exists "devices: 내 기기만 조회" on public.member_devices;
create policy "devices: 내 기기만 조회" on public.member_devices
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "entries: 가입한 사람은 모두 조회" on public.entries;
create policy "entries: 가입한 사람은 모두 조회" on public.entries
  for select to authenticated
  using (public.current_member_id() is not null);

drop policy if exists "entries: 내 답장만 작성" on public.entries;
create policy "entries: 내 답장만 작성" on public.entries
  for insert to authenticated
  with check (member_id = public.current_member_id());

drop policy if exists "entries: 내 답장만 수정" on public.entries;
create policy "entries: 내 답장만 수정" on public.entries
  for update to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

drop policy if exists "entries: 내 답장만 삭제" on public.entries;
create policy "entries: 내 답장만 삭제" on public.entries
  for delete to authenticated
  using (member_id = public.current_member_id());

-- 4) Storage (사진) ---------------------------------------------

-- 비공개 버킷, 파일당 최대 3MB, 이미지 형식만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos: 가입한 사람은 모두 보기" on storage.objects;
create policy "photos: 가입한 사람은 모두 보기" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.current_member_id() is not null);

drop policy if exists "photos: 내 폴더에만 올리기" on storage.objects;
create policy "photos: 내 폴더에만 올리기" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_member_id()::text
  );

drop policy if exists "photos: 내 사진만 삭제" on storage.objects;
create policy "photos: 내 사진만 삭제" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = public.current_member_id()::text
  );

-- 5) 초기 데이터 (꼭 수정하세요) --------------------------------

-- 모임 코드: 카톡방에만 공유할 비밀 단어로 바꾸세요
insert into public.app_config (key, value)
values ('join_code', '여기에-모임코드')
on conflict (key) do update set value = excluded.value;

-- 멤버 이름 6명: 실제 이름으로 바꾸세요 (sort = 표시 순서)
insert into public.members (name, sort) values
  ('이름1', 1),
  ('이름2', 2),
  ('이름3', 3),
  ('이름4', 4),
  ('이름5', 5),
  ('이름6', 6)
on conflict (name) do nothing;
