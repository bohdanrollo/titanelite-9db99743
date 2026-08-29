create table if not exists public.pephub_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  bio text,
  created_at timestamptz not null default now()
);
grant select on public.pephub_profiles to anon;
grant select, insert, update on public.pephub_profiles to authenticated;
grant all on public.pephub_profiles to service_role;
alter table public.pephub_profiles enable row level security;
create policy "profiles are public" on public.pephub_profiles for select using (true);
create policy "own profile insert" on public.pephub_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "own profile update" on public.pephub_profiles for update to authenticated using (auth.uid() = user_id);

create table if not exists public.pephub_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
grant select on public.pephub_posts to anon;
grant select, insert, delete on public.pephub_posts to authenticated;
grant all on public.pephub_posts to service_role;
alter table public.pephub_posts enable row level security;
create policy "posts are public" on public.pephub_posts for select using (true);
create policy "own post insert" on public.pephub_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "own post delete" on public.pephub_posts for delete to authenticated using (auth.uid() = user_id);
create index if not exists pephub_posts_created_idx on public.pephub_posts (created_at desc);
create index if not exists pephub_posts_user_idx on public.pephub_posts (user_id);

create table if not exists public.pephub_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pephub_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
grant select on public.pephub_comments to anon;
grant select, insert, delete on public.pephub_comments to authenticated;
grant all on public.pephub_comments to service_role;
alter table public.pephub_comments enable row level security;
create policy "comments are public" on public.pephub_comments for select using (true);
create policy "own comment insert" on public.pephub_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "own comment delete" on public.pephub_comments for delete to authenticated using (auth.uid() = user_id);
create index if not exists pephub_comments_post_idx on public.pephub_comments (post_id, created_at);

create table if not exists public.pephub_likes (
  post_id uuid not null references public.pephub_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
grant select on public.pephub_likes to anon;
grant select, insert, delete on public.pephub_likes to authenticated;
grant all on public.pephub_likes to service_role;
alter table public.pephub_likes enable row level security;
create policy "likes are public" on public.pephub_likes for select using (true);
create policy "own like insert" on public.pephub_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "own like delete" on public.pephub_likes for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.pephub_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
grant select on public.pephub_follows to anon;
grant select, insert, delete on public.pephub_follows to authenticated;
grant all on public.pephub_follows to service_role;
alter table public.pephub_follows enable row level security;
create policy "follows are public" on public.pephub_follows for select using (true);
create policy "own follow insert" on public.pephub_follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "own follow delete" on public.pephub_follows for delete to authenticated using (auth.uid() = follower_id);