-- =====================================================================
-- v13: Blog. Anyone can read published posts; only admins (public.admins) can write. Safe to run more than once.
-- =====================================================================
create table if not exists public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  lang         text not null default 'en' check (lang in ('en','hi','gu','ta','te','kn')),
  slug         text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 90),
  title        text not null check (length(title) between 3 and 160),
  excerpt      text check (length(excerpt) <= 320),
  body         text not null default '',
  category     text not null default 'basics',
  tags         text[] not null default '{}',
  cover_url    text check (cover_url is null or cover_url ~ '^https://'),
  group_key    text,               -- same value on translations of one article, so pages can link them
  status       text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  author_id    uuid default auth.uid() references auth.users(id) on delete set null,
  unique (lang, slug)
);
create index if not exists blog_posts_pub_idx on public.blog_posts (lang, status, published_at desc);
alter table public.blog_posts enable row level security;
drop policy if exists "Read published posts" on public.blog_posts;
create policy "Read published posts" on public.blog_posts for select using (status = 'published' or public.is_admin());
drop policy if exists "Admins write posts" on public.blog_posts;
create policy "Admins write posts" on public.blog_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;

create or replace function public.blog_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
drop trigger if exists blog_touch on public.blog_posts;
create trigger blog_touch before insert or update on public.blog_posts for each row execute function public.blog_touch();
