create table if not exists players (
  id text primary key,
  name varchar(12) not null,
  avatar_icon text not null,
  avatar_color char(7) not null,
  solo_high_score integer not null default 0 check (solo_high_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table players
  add column if not exists solo_high_score integer not null default 0;

create table if not exists player_sessions (
  token text primary key,
  player_id text not null references players(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists player_sessions_player_id_created_at_idx
  on player_sessions(player_id, created_at desc);

create table if not exists battle_history_records (
  id text primary key,
  player_id text not null references players(id) on delete cascade,
  room_id text not null,
  played_at timestamptz not null default now(),
  outcome text not null check (outcome in ('win', 'loss', 'draw')),
  player_name varchar(12) not null,
  player_avatar_icon text not null,
  player_avatar_color char(7) not null,
  opponent_name varchar(12) not null,
  opponent_avatar_icon text not null,
  opponent_avatar_color char(7) not null,
  total_score integer not null check (total_score >= 0),
  opponent_score integer not null check (opponent_score >= 0),
  remaining_hp integer not null check (remaining_hp >= 0),
  opponent_hp integer not null check (opponent_hp >= 0),
  rounds_played integer not null check (rounds_played > 0)
);

create index if not exists battle_history_records_player_played_at_idx
  on battle_history_records(player_id, played_at desc);

create table if not exists historical_events (
  id text primary key,
  title text not null,
  description text not null,
  year integer not null,
  lat double precision not null,
  lng double precision not null,
  location text not null,
  category text not null check (category in ('world', 'china')),
  wikipedia_title text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists historical_events_category_idx
  on historical_events(category);
