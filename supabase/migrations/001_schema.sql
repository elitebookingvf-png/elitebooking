-- ============================================================
-- ELITEBOOKING — Schéma Supabase (PostgreSQL)
-- ============================================================
-- Ordre d'exécution : coller dans Supabase > SQL Editor > Run

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── PROFILES (extension de auth.users) ─────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  firstname   text not null,
  lastname    text not null,
  phone       text,
  type        text not null default 'client' check (type in ('client','pro')),
  salon_id    uuid,                -- rempli après création du salon (pro)
  plan        text default 'trial' check (plan in ('trial','starter','pro')),
  trial_ends_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── SALONS ─────────────────────────────────────────────────
create table public.salons (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  category     text not null check (category in ('hammam','coiffure','onglerie','massage','esthetic','barbier','autre')),
  city         text not null,
  address      text,
  phone        text,
  email        text,
  description  text,
  rating       numeric(3,1) default 4.5,
  review_count integer default 0,
  active       boolean default true,
  whatsapp     text,
  instagram    text,
  cover_image  text,
  pin          text default '0000',      -- 4 chiffres, protège CA + annulation
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index idx_salons_city_category on public.salons(city, category);
create index idx_salons_owner on public.salons(owner_id);

-- FK profiles → salons (après création salons)
alter table public.profiles
  add constraint fk_profiles_salon foreign key (salon_id) references public.salons(id) on delete set null;

-- ─── SERVICE_CATEGORIES ─────────────────────────────────────
create table public.service_categories (
  id        uuid primary key default uuid_generate_v4(),
  salon_id  uuid not null references public.salons(id) on delete cascade,
  name      text not null,
  color     text default '#C17B4E',
  "order"   integer default 0,
  created_at timestamptz default now()
);
create index idx_svc_cats_salon on public.service_categories(salon_id, "order");

-- ─── SERVICES ───────────────────────────────────────────────
create table public.services (
  id           uuid primary key default uuid_generate_v4(),
  salon_id     uuid not null references public.salons(id) on delete cascade,
  cat_id       uuid references public.service_categories(id) on delete set null,
  name         text not null,
  description  text,
  price_type   text default 'fixed' check (price_type in ('fixed','from','quote')),
  price        numeric(10,2) default 0,
  duration     integer not null check (duration >= 5),  -- minutes
  staff_ids    uuid[] default '{}',                     -- ids de staffs habilités; vide = tous
  active       boolean default true,
  "order"      integer default 0,
  created_at   timestamptz default now()
);
create index idx_services_salon on public.services(salon_id, cat_id, "order");

-- ─── STAFF ──────────────────────────────────────────────────
create table public.staff (
  id         uuid primary key default uuid_generate_v4(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  firstname  text not null,
  lastname   text not null,
  role       text default 'Employé(e)',
  days       text[] default '{}',   -- ['Lu','Ma','Me','Je','Ve','Sa','Di']
  start_time text default '09:00',
  end_time   text default '19:00',
  phone      text,
  avatar     text,
  active     boolean default true,
  created_at timestamptz default now()
);
create index idx_staff_salon on public.staff(salon_id);

-- ─── SCHEDULES (1 par salon) ────────────────────────────────
create table public.schedules (
  id        uuid primary key default uuid_generate_v4(),
  salon_id  uuid not null unique references public.salons(id) on delete cascade,
  -- Chaque jour : is_open, start_time, end_time
  lu_open   boolean default true,  lu_start text default '09:00', lu_end text default '19:00',
  ma_open   boolean default true,  ma_start text default '09:00', ma_end text default '19:00',
  me_open   boolean default true,  me_start text default '09:00', me_end text default '19:00',
  je_open   boolean default true,  je_start text default '09:00', je_end text default '19:00',
  ve_open   boolean default true,  ve_start text default '09:00', ve_end text default '19:00',
  sa_open   boolean default true,  sa_start text default '09:00', sa_end text default '18:00',
  di_open   boolean default false, di_start text default '09:00', di_end text default '18:00',
  updated_at timestamptz default now()
);

-- ─── BLOCKS (indisponibilités manuelles) ────────────────────
create table public.blocks (
  id         uuid primary key default uuid_generate_v4(),
  salon_id   uuid not null references public.salons(id) on delete cascade,
  staff_id   uuid references public.staff(id) on delete cascade,  -- null = tout le salon
  label      text default 'Blocage',
  date       date not null,
  start_time text not null,
  end_time   text not null,
  created_at timestamptz default now()
);
create index idx_blocks_salon_date on public.blocks(salon_id, date);

-- ─── RDVS (rendez-vous) ─────────────────────────────────────
create table public.rdvs (
  id            uuid primary key default uuid_generate_v4(),
  -- Client : soit un vrai compte, soit ajout manuel par le pro
  client_id     uuid references public.profiles(id) on delete set null,
  client_name   text not null,           -- toujours rempli (dénormalisé)
  client_phone  text,
  -- Salon
  salon_id      uuid not null references public.salons(id) on delete cascade,
  salon_name    text not null,           -- dénormalisé
  -- Prestation
  service_id    uuid not null references public.services(id) on delete restrict,
  service_name  text not null,           -- dénormalisé
  -- Staff
  staff_id      uuid not null references public.staff(id) on delete restrict,
  staff_name    text not null,           -- dénormalisé
  -- Horaire
  date          date not null,
  start_time    text not null,           -- 'HH:MM'
  duration      integer not null,        -- minutes
  -- Prix
  price         numeric(10,2) default 0,
  price_type    text default 'fixed' check (price_type in ('fixed','from','quote')),
  -- Statut & meta
  status        text default 'confirmed' check (status in ('confirmed','cancelled','completed','no-show')),
  notes         text,
  group_id      uuid,                    -- lie plusieurs prestations réservées ensemble
  source        text default 'client' check (source in ('client','pro')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index idx_rdvs_salon_date    on public.rdvs(salon_id, date);
create index idx_rdvs_client        on public.rdvs(client_id, status);
create index idx_rdvs_staff_date    on public.rdvs(staff_id, date);
create index idx_rdvs_group         on public.rdvs(group_id);

-- ─── TRIGGERS updated_at ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated   before update on public.profiles   for each row execute function public.set_updated_at();
create trigger trg_salons_updated     before update on public.salons     for each row execute function public.set_updated_at();
create trigger trg_rdvs_updated       before update on public.rdvs       for each row execute function public.set_updated_at();
create trigger trg_schedules_updated  before update on public.schedules  for each row execute function public.set_updated_at();

-- ─── FUNCTION : créer profil automatiquement à l'inscription ─
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, firstname, lastname, type, plan, trial_ends_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'firstname', ''),
    coalesce(new.raw_user_meta_data->>'lastname', ''),
    coalesce(new.raw_user_meta_data->>'type', 'client'),
    'trial',
    now() + interval '14 days'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
