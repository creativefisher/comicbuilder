-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Comics table
create table public.comics (
  id            uuid primary key default uuid_generate_v4(),
  age_range     text not null check (age_range in ('5-8', '9-12', '13+')),
  theme         text not null,
  title         text,
  status        text not null default 'pending'
                  check (status in ('pending','generating_script','generating_characters',
                                    'generating_panels','complete','error')),
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Characters table
create table public.characters (
  id                  uuid primary key default uuid_generate_v4(),
  comic_id            uuid not null references public.comics(id) on delete cascade,
  name                text not null,
  photo_url           text not null,
  reference_sheet_url text,
  visual_description  text,
  created_at          timestamptz not null default now()
);

-- Panels table
create table public.panels (
  id                uuid primary key default uuid_generate_v4(),
  comic_id          uuid not null references public.comics(id) on delete cascade,
  panel_number      int not null,
  scene_description text not null,
  dialogue          jsonb not null default '[]',
  character_actions jsonb not null default '{}',
  panel_characters  jsonb not null default '[]',
  image_url         text,
  created_at        timestamptz not null default now(),
  unique (comic_id, panel_number)
);

-- Indexes
create index characters_comic_id on public.characters (comic_id);
create index panels_comic_order on public.panels (comic_id, panel_number);

-- Updated_at trigger for comics
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger comics_updated_at
  before update on public.comics
  for each row execute function update_updated_at();

-- Row Level Security
alter table public.comics enable row level security;
alter table public.characters enable row level security;
alter table public.panels enable row level security;

-- Anyone can read comic status (for polling)
create policy "Anyone can read comics"
  on public.comics for select using (true);

create policy "Anyone can read panels"
  on public.panels for select using (true);

create policy "Anyone can read characters"
  on public.characters for select using (true);

-- Storage buckets must be created via dashboard or CLI:
-- bucket: comic-uploads  (private, for user-uploaded character photos)
-- bucket: comic-assets   (public, for generated images)
