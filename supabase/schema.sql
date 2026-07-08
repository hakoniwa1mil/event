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

-- カード生成APIのIPごとの呼び出し回数を記録 (料金の際限ない増加を防ぐレート制限用)
create table if not exists generate_calls (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists generate_calls_ip_idx on generate_calls(ip);

-- APIアクセスはサーバー側のservice roleキー経由のみなのでRLSは有効化して閉じておく
alter table events enable row level security;
alter table participants enable row level security;
alter table generate_calls enable row level security;
