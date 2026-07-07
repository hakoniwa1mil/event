-- Supabaseのダッシュボード > SQL Editor に貼り付けて実行してください

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  x_name text not null,
  x_id text not null,
  icon text, -- リサイズ済みアイコン画像 (data URL)
  answers jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists participants_event_id_idx on participants(event_id);

-- APIアクセスはサーバー側のservice roleキー経由のみなのでRLSは有効化して閉じておく
alter table events enable row level security;
alter table participants enable row level security;
