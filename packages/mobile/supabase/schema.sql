-- FoodOS Initial Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean up existing tables to ensure a clean slate
drop table if exists public.activity_logs cascade;
drop table if exists public.saved_items cascade;
drop table if exists public.prep_suggestions cascade;
drop table if exists public.meal_windows cascade;
drop table if exists public.schedule_patterns cascade;
drop table if exists public.behavior_events cascade;
drop table if exists public.posts cascade;
drop table if exists public.recipes cascade;
drop table if exists public.pantry_items cascade;
drop table if exists public.profiles cascade;

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  persona text,
  goals text[] default '{}',
  dietary_tags text[] default '{}',
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Pantry Items
create table public.pantry_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  quantity numeric,
  unit text,
  expiry_date timestamptz,
  is_staple boolean default false,
  is_manual boolean default true,
  created_at timestamptz default now()
);

-- 3. Recipes
create table public.recipes (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  macros jsonb not null default '{"calories": 0, "protein": 0, "carbs": 0, "fat": 0}'::jsonb,
  tags text[] default '{}',
  cook_time integer not null,
  media_url text,
  media_type text,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Posts
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references auth.users(id) on delete cascade not null,
  post_type text not null,
  caption text,
  media_url text,
  recipe_id uuid references public.recipes(id) on delete set null,
  like_count integer default 0,
  view_count integer default 0,
  share_count integer default 0,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

-- 5. Behavior Events
create table public.behavior_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null,
  entity_id text,
  session_id text,
  timestamp timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- 6. Schedule Patterns
create table public.schedule_patterns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  context text default 'default',
  is_drifted boolean default false,
  is_manual boolean default false,
  updated_at timestamptz default now()
);

-- 7. Meal Windows
create table public.meal_windows (
  id uuid default uuid_generate_v4() primary key,
  schedule_pattern_id uuid references public.schedule_patterns(id) on delete cascade not null,
  day_of_week integer not null,
  window_name text not null,
  start_time text not null,
  end_time text not null,
  is_manual_override boolean default false
);

-- 8. Prep Suggestions
create table public.prep_suggestions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  target_datetime timestamptz not null,
  dismissed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz default now()
);

-- 9. Saved Items
create table public.saved_items (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz default now()
);

-- 10. Activity Logs
create table public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  activity_type text not null,
  duration_min integer not null,
  intensity text,
  source_id text,
  logged_at timestamptz default now()
);

-- Turn on Row Level Security (RLS) for all tables
alter table public.profiles enable row level security;
alter table public.pantry_items enable row level security;
alter table public.recipes enable row level security;
alter table public.posts enable row level security;
alter table public.behavior_events enable row level security;
alter table public.schedule_patterns enable row level security;
alter table public.meal_windows enable row level security;
alter table public.prep_suggestions enable row level security;
alter table public.saved_items enable row level security;
alter table public.activity_logs enable row level security;

-- Basic Policies: Allow Authenticated Users Full Access for Prototyping
create policy "Allow full access to profiles" on public.profiles for all to authenticated using (true);
create policy "Allow full access to pantry_items" on public.pantry_items for all to authenticated using (true);
create policy "Allow full access to recipes" on public.recipes for all to authenticated using (true);
create policy "Allow full access to posts" on public.posts for all to authenticated using (true);
create policy "Allow full access to behavior_events" on public.behavior_events for all to authenticated using (true);
create policy "Allow full access to schedule_patterns" on public.schedule_patterns for all to authenticated using (true);
create policy "Allow full access to meal_windows" on public.meal_windows for all to authenticated using (true);
create policy "Allow full access to prep_suggestions" on public.prep_suggestions for all to authenticated using (true);
create policy "Allow full access to saved_items" on public.saved_items for all to authenticated using (true);
create policy "Allow full access to activity_logs" on public.activity_logs for all to authenticated using (true);

-- Optional: Create some dummy data for recipes so the Home feed isn't completely empty!
insert into public.recipes (title, description, cook_time, ingredients, macros)
values 
  ('Avocado Toast', 'Quick and healthy breakfast', 10, '[{"name": "Avocado", "quantity": 1}, {"name": "Bread", "quantity": 2}]', '{"calories": 350, "protein": 10, "carbs": 30, "fat": 20}'),
  ('Chicken Rice Bowl', 'Perfect for meal prep', 30, '[{"name": "Chicken Breast", "quantity": 1}, {"name": "Rice", "quantity": 1}]', '{"calories": 500, "protein": 40, "carbs": 45, "fat": 15}');

-- Safely insert dummy posts and prep suggestions for the current user
DO $$
DECLARE
  v_user_id uuid;
  v_recipe1_id uuid;
  v_recipe2_id uuid;
BEGIN
  -- Get the first user id (since the user just signed up)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Get the two recipes we just inserted
    SELECT id INTO v_recipe1_id FROM public.recipes WHERE title = 'Avocado Toast' LIMIT 1;
    SELECT id INTO v_recipe2_id FROM public.recipes WHERE title = 'Chicken Rice Bowl' LIMIT 1;

    -- Insert dummy posts for the Discover feed
    INSERT INTO public.posts (author_id, post_type, caption, recipe_id, like_count)
    VALUES 
      (v_user_id, 'recipe_card', 'Check out my favorite breakfast!', v_recipe1_id, 42),
      (v_user_id, 'image', 'Meal prep sunday is going great 💪', v_recipe2_id, 108);

    -- Insert dummy prep suggestions for the Prep tab (scheduled for tomorrow)
    INSERT INTO public.prep_suggestions (user_id, recipe_id, target_datetime)
    VALUES
      (v_user_id, v_recipe2_id, now() + interval '1 day');
  END IF;
END $$;

-- Force Supabase to reload the schema cache so the app can see the new tables immediately
NOTIFY pgrst, 'reload schema';
