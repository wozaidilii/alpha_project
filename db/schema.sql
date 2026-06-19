create table if not exists players (
  id text primary key,
  email text,
  name varchar(12) not null,
  avatar_icon text not null,
  avatar_color char(7) not null,
  profile_completed boolean not null default false,
  solo_high_score integer not null default 0 check (solo_high_score >= 0),
  wechat_openid text,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table players
  add column if not exists email text;

alter table players
  add column if not exists profile_completed boolean not null default false;

alter table players
  add column if not exists solo_high_score integer not null default 0;

alter table players
  add column if not exists wechat_openid text;

alter table players
  add column if not exists password_hash text;

create unique index if not exists players_email_idx
  on players(email);

create unique index if not exists players_wechat_openid_idx
  on players(wechat_openid);

create table if not exists player_sessions (
  token text primary key,
  player_id text not null references players(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists player_sessions_player_id_created_at_idx
  on player_sessions(player_id, created_at desc);

create table if not exists player_email_verification_codes (
  id text primary key,
  email text not null,
  code_hash text not null,
  attempts integer not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists player_email_codes_email_created_at_idx
  on player_email_verification_codes(email, created_at desc);

create index if not exists player_email_codes_expires_at_idx
  on player_email_verification_codes(expires_at);

create table if not exists player_activity_events (
  id text primary key,
  player_id text references players(id) on delete set null,
  email text,
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  route text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists player_activity_events_player_created_at_idx
  on player_activity_events(player_id, created_at desc);

create index if not exists player_activity_events_email_created_at_idx
  on player_activity_events(email, created_at desc);

create index if not exists player_activity_events_type_created_at_idx
  on player_activity_events(event_type, created_at desc);

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
  funfact jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table historical_events
  add column if not exists funfact jsonb not null default '[]'::jsonb;

alter table historical_events
  add column if not exists hint text;

alter table historical_events
  add column if not exists difficulty integer check (difficulty is null or (difficulty >= 1 and difficulty <= 5));

create index if not exists historical_events_category_idx
  on historical_events(category);

create index if not exists historical_events_difficulty_idx
  on historical_events(difficulty);

-- 历史冷知识答题：每条 raw 记录拆成选择题 + 判断题两行
create table if not exists funfact_questions (
  id text primary key,
  source_id text not null,
  format text not null check (format in ('multiple_choice', 'true_false')),
  title text not null,
  stem text not null,
  options jsonb not null,
  correct_index integer not null check (correct_index >= 0),
  explanation text,
  category text not null,
  description text,
  hint text,
  funfact jsonb not null default '[]'::jsonb,
  difficulty integer,
  image_url text,
  fallback_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table funfact_questions
  add column if not exists description text;

alter table funfact_questions
  add column if not exists fallback_image_url text;

create index if not exists funfact_questions_category_idx
  on funfact_questions(category);

create index if not exists funfact_questions_format_idx
  on funfact_questions(format);

create index if not exists funfact_questions_source_id_idx
  on funfact_questions(source_id);

create index if not exists funfact_questions_difficulty_idx
  on funfact_questions(difficulty);

-- 历史寻图题：按城市聚合 hint / funfact，出题时在城内随机选百度全景坐标
create table if not exists location_tuxun_questions (
  id text primary key,
  source_id text not null,
  location text not null,
  modern_name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km double precision not null default 20 check (radius_km > 0),
  title text not null,
  aspect text,
  hint text not null,
  funfact jsonb not null default '[]'::jsonb,
  difficulty integer check (difficulty is null or (difficulty >= 1 and difficulty <= 5)),
  quality_flags text[] not null default '{}',
  year integer,
  year_end integer,
  year_note text,
  category text not null,
  subject_note text,
  location_scope text,
  location_note text,
  ancient_names jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists location_tuxun_questions_location_idx
  on location_tuxun_questions(location);

create index if not exists location_tuxun_questions_source_id_idx
  on location_tuxun_questions(source_id);

create index if not exists location_tuxun_questions_difficulty_idx
  on location_tuxun_questions(difficulty);

create index if not exists location_tuxun_questions_enabled_idx
  on location_tuxun_questions(enabled);

create table if not exists location_tuxun_street_view_scenes (
  location text primary key,
  status text not null check (status in ('available', 'unavailable')),
  scene_lat double precision,
  scene_lng double precision,
  pano_id text,
  last_checked_at timestamptz not null default now(),
  lookup_failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'available' and scene_lat is not null and scene_lng is not null)
    or (status = 'unavailable')
  )
);

create index if not exists location_tuxun_street_view_scenes_status_updated_idx
  on location_tuxun_street_view_scenes(status, updated_at desc);

-- 动漫寻图题：按日本城市聚合动漫 hint，出题时在城内随机选 Google 街景坐标
create table if not exists anime_tuxun_questions (
  id text primary key,
  source_id text not null,
  location text not null,
  modern_name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km double precision not null default 12 check (radius_km > 0),
  title text not null,
  anime_title text not null,
  aspect text,
  hint text not null,
  funfact jsonb not null default '[]'::jsonb,
  difficulty integer check (difficulty is null or (difficulty >= 1 and difficulty <= 5)),
  quality_flags text[] not null default '{}',
  year integer,
  year_end integer,
  year_note text,
  category text not null,
  region text,
  prefectures jsonb not null default '[]'::jsonb,
  subject_note text,
  location_scope text,
  location_note text,
  real_place_name text,
  fictional_place_names jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anime_tuxun_questions_location_idx
  on anime_tuxun_questions(location);

create index if not exists anime_tuxun_questions_source_id_idx
  on anime_tuxun_questions(source_id);

create index if not exists anime_tuxun_questions_anime_title_idx
  on anime_tuxun_questions(anime_title);

create index if not exists anime_tuxun_questions_difficulty_idx
  on anime_tuxun_questions(difficulty);

create index if not exists anime_tuxun_questions_enabled_idx
  on anime_tuxun_questions(enabled);

create table if not exists anime_tuxun_street_view_scenes (
  location text primary key,
  status text not null check (status in ('available', 'unavailable')),
  scene_lat double precision,
  scene_lng double precision,
  pano_id text,
  last_checked_at timestamptz not null default now(),
  lookup_failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'available' and scene_lat is not null and scene_lng is not null)
    or (status = 'unavailable')
  )
);

create index if not exists anime_tuxun_street_view_scenes_status_updated_idx
  on anime_tuxun_street_view_scenes(status, updated_at desc);
