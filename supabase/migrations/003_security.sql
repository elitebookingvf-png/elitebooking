-- ============================================================
-- ELITEBOOKING — 003 : Durcissement sécurité
-- ============================================================
-- À exécuter APRÈS 002_rls.sql dans Supabase > SQL Editor
--
-- 1) Le rôle `anon` (visiteurs) ne peut plus lire les colonnes
--    sensibles de salons / staff via l'API REST publique
--    (pin, blocked_clients, owner_id, ice, téléphone employé).
-- 2) Trigger anti-escalade : un utilisateur ne peut pas modifier
--    son propre profiles.type ni profiles.salon_id (contournement
--    de l'autorisation pro). Seul le service_role (backend) peut.
-- ============================================================

-- ─── 1. Privilèges colonnes — rôle anon ─────────────────────
-- On retire le SELECT table-level à anon, puis on réautorise
-- uniquement les colonnes publiques. Les policies RLS 002
-- continuent de s'appliquer en plus (défense en profondeur).

revoke select on public.salons from anon;
grant select (
  id, name, category, city, address, description,
  rating, review_count, phone, whatsapp, instagram,
  cover_image, active, created_at
) on public.salons to anon;

revoke select on public.staff from anon;
grant select (
  id, salon_id, firstname, lastname, role,
  days, start_time, end_time, avatar, active
) on public.staff to anon;

-- Les tables purement internes : aucun accès anon direct.
revoke select on public.rdvs     from anon;
revoke select on public.blocks   from anon;
revoke select on public.profiles from anon;

-- ─── 2. Trigger anti-escalade sur profiles ──────────────────
-- profiles_update_own (RLS) permet à un utilisateur de mettre à
-- jour SA ligne — y compris type='pro' et salon_id, ce qui
-- donnerait accès aux données d'un salon. Ce trigger refuse tout
-- changement de ces deux colonnes hors service_role.

create or replace function public.profiles_no_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (routes API admin) et SQL direct (rôle NULL) peuvent tout modifier
  if (auth.role() is null or auth.role() = 'service_role') then
    return new;
  end if;
  if (new.type is distinct from old.type)
     or (new.salon_id is distinct from old.salon_id) then
    raise exception 'profiles: modification de type/salon_id interdite';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_no_escalation_trg on public.profiles;
create trigger profiles_no_escalation_trg
  before update on public.profiles
  for each row execute function public.profiles_no_escalation();
