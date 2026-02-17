-- ============================================
-- Fitness Tracker Pro — Supabase Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Profiles
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text not null default 'User',
  profile_photo_url text,
  current_split text not null default 'Full Body',
  volume_per_muscle integer not null default 2,
  language text default 'en',
  created_at timestamptz default now()
);

-- Workouts
create table if not exists workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  rpe integer not null default 5,
  notes text default '',
  exercises jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Progress photos
create table if not exists photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  storage_path text,
  thumbnail_url text,
  date text not null,
  caption text,
  created_at timestamptz default now()
);

-- Exercise history
create table if not exists exercise_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_id text not null,
  exercise_name text not null,
  muscle_group text not null,
  date text not null,
  best_weight numeric not null default 0,
  best_reps integer not null default 0,
  total_volume numeric not null default 0,
  sets jsonb not null default '[]',
  created_at timestamptz default now()
);

-- User settings
create table if not exists user_settings (
  id uuid references auth.users(id) on delete cascade primary key,
  gemini_api_key text default '',
  language text default 'en',
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_workouts_user_date on workouts(user_id, date desc);
create index if not exists idx_photos_user_date on photos(user_id, date desc);
create index if not exists idx_exercise_history_user_date on exercise_history(user_id, date desc);

-- ============================================
-- Row Level Security
-- ============================================

alter table profiles enable row level security;
alter table workouts enable row level security;
alter table photos enable row level security;
alter table exercise_history enable row level security;
alter table user_settings enable row level security;

-- Profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Workouts
create policy "Users can view own workouts" on workouts for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on workouts for insert with check (auth.uid() = user_id);
create policy "Users can delete own workouts" on workouts for delete using (auth.uid() = user_id);

-- Photos
create policy "Users can view own photos" on photos for select using (auth.uid() = user_id);
create policy "Users can insert own photos" on photos for insert with check (auth.uid() = user_id);
create policy "Users can delete own photos" on photos for delete using (auth.uid() = user_id);

-- Exercise history
create policy "Users can view own history" on exercise_history for select using (auth.uid() = user_id);
create policy "Users can insert own history" on exercise_history for insert with check (auth.uid() = user_id);

-- User settings
create policy "Users can view own settings" on user_settings for select using (auth.uid() = id);
create policy "Users can insert own settings" on user_settings for insert with check (auth.uid() = id);
create policy "Users can update own settings" on user_settings for update using (auth.uid() = id);

-- ============================================
-- Storage bucket for photos
-- ============================================

insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict do nothing;

-- Users can upload to their own folder: {userId}/...
create policy "Users can upload to own folder" on storage.objects for insert
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete from their own folder
create policy "Users can delete from own folder" on storage.objects for delete
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public bucket = anyone can read (for displaying images)
create policy "Public read access" on storage.objects for select
  using (bucket_id = 'photos');
