-- ============================================================
-- ELITEBOOKING — Row Level Security (RLS) Policies
-- ============================================================
-- À exécuter APRÈS 001_schema.sql dans Supabase > SQL Editor

-- Activer RLS sur toutes les tables
alter table public.profiles          enable row level security;
alter table public.salons            enable row level security;
alter table public.service_categories enable row level security;
alter table public.services          enable row level security;
alter table public.staff             enable row level security;
alter table public.schedules         enable row level security;
alter table public.blocks            enable row level security;
alter table public.rdvs              enable row level security;

-- ─── PROFILES ───────────────────────────────────────────────
-- Lecture : utilisateur lit son propre profil
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Mise à jour : utilisateur modifie son propre profil
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ─── SALONS ─────────────────────────────────────────────────
-- Lecture publique des salons actifs
create policy "salons_select_public" on public.salons
  for select using (active = true);

-- Le pro peut aussi lire son salon même si inactive
create policy "salons_select_own" on public.salons
  for select using (auth.uid() = owner_id);

-- Insertion : pro crée son salon
create policy "salons_insert_pro" on public.salons
  for insert with check (auth.uid() = owner_id);

-- Mise à jour : pro modifie son salon
create policy "salons_update_own" on public.salons
  for update using (auth.uid() = owner_id);

-- ─── SERVICE_CATEGORIES ─────────────────────────────────────
-- Lecture publique
create policy "svc_cats_select_public" on public.service_categories
  for select using (true);

-- CRUD réservé au pro propriétaire du salon
create policy "svc_cats_crud_pro" on public.service_categories
  for all using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- ─── SERVICES ───────────────────────────────────────────────
create policy "services_select_public" on public.services
  for select using (active = true);

create policy "services_select_own" on public.services
  for select using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

create policy "services_crud_pro" on public.services
  for all using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- ─── STAFF ──────────────────────────────────────────────────
create policy "staff_select_public" on public.staff
  for select using (active = true);

create policy "staff_crud_pro" on public.staff
  for all using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- ─── SCHEDULES ──────────────────────────────────────────────
create policy "schedules_select_public" on public.schedules
  for select using (true);

create policy "schedules_crud_pro" on public.schedules
  for all using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- ─── BLOCKS ─────────────────────────────────────────────────
create policy "blocks_select_pro" on public.blocks
  for select using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

create policy "blocks_crud_pro" on public.blocks
  for all using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- ─── RDVS ───────────────────────────────────────────────────
-- Client : voit ses propres RDV
create policy "rdvs_select_client" on public.rdvs
  for select using (client_id = auth.uid());

-- Pro : voit tous les RDV de son salon
create policy "rdvs_select_pro" on public.rdvs
  for select using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- Client : crée ses RDV
create policy "rdvs_insert_client" on public.rdvs
  for insert with check (client_id = auth.uid() or client_id is null);

-- Pro : crée des RDV pour son salon
create policy "rdvs_insert_pro" on public.rdvs
  for insert with check (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );

-- Client : annule ses propres RDV confirmés
create policy "rdvs_cancel_client" on public.rdvs
  for update using (client_id = auth.uid() and status = 'confirmed')
  with check (status = 'cancelled');

-- Pro : modifie le statut de tous les RDV de son salon
create policy "rdvs_update_pro" on public.rdvs
  for update using (
    exists (select 1 from public.salons s where s.id = salon_id and s.owner_id = auth.uid())
  );
