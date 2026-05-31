create table if not exists public.profiles (
  id text primary key,
  name text not null,
  email text not null unique,
  role text not null check (role in ('member', 'admin')),
  initials text not null,
  phone text,
  birth_date text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birth_date text;
alter table public.profiles add column if not exists address text;
create unique index if not exists profiles_email_unique on public.profiles (lower(email));

create table if not exists public.fellowship_sessions (
  id text primary key,
  title text not null,
  session_date text not null,
  session_time text not null,
  location text not null,
  status text not null check (status in ('open', 'upcoming', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  user_name text not null,
  session_id text not null references public.fellowship_sessions(id) on delete cascade,
  session text not null,
  attendance_date text not null,
  status text not null check (status in ('Present', 'Absent')),
  notes text not null default '-',
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback_entries (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  user_name text not null,
  session_id text not null references public.fellowship_sessions(id) on delete cascade,
  session text not null,
  feedback_date text not null,
  rating integer not null check (rating between 1 and 5),
  learned text not null default '',
  suggestions text not null default '',
  submitted_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  author text not null check (author in ('ai', 'user')),
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.session_summaries (
  id text primary key,
  session_id text not null references public.fellowship_sessions(id) on delete cascade,
  session text not null,
  user_id text not null references public.profiles(id) on delete cascade,
  user_name text not null,
  type text not null check (type in ('brief', 'detailed', 'scripture', 'action')),
  transcript text not null,
  summary text not null,
  scriptures text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists attendance_records_user_id_idx on public.attendance_records(user_id);
create index if not exists feedback_entries_user_id_idx on public.feedback_entries(user_id);
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id);
create index if not exists session_summaries_session_id_idx on public.session_summaries(session_id);
create index if not exists session_summaries_user_id_idx on public.session_summaries(user_id);

alter table public.profiles enable row level security;
alter table public.fellowship_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.chat_messages enable row level security;
alter table public.session_summaries enable row level security;

create policy "demo read profiles" on public.profiles for select using (true);
create policy "demo write profiles" on public.profiles for all using (true) with check (true);

create policy "demo read sessions" on public.fellowship_sessions for select using (true);
create policy "demo write sessions" on public.fellowship_sessions for all using (true) with check (true);

create policy "demo read attendance" on public.attendance_records for select using (true);
create policy "demo write attendance" on public.attendance_records for all using (true) with check (true);

create policy "demo read feedback" on public.feedback_entries for select using (true);
create policy "demo write feedback" on public.feedback_entries for all using (true) with check (true);

create policy "demo read chat" on public.chat_messages for select using (true);
create policy "demo write chat" on public.chat_messages for all using (true) with check (true);

create policy "demo read summaries" on public.session_summaries for select using (true);
create policy "demo write summaries" on public.session_summaries for all using (true) with check (true);
