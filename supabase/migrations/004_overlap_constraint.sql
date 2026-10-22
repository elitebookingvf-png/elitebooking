-- ─────────────────────────────────────────────────────────────
-- 004 — Contrainte anti double-réservation (niveau base de données)
--
-- Les vérifications applicatives (computeAvailability, isSlotFree)
-- ont une fenêtre de course : deux requêtes simultanées peuvent
-- toutes deux voir le créneau libre puis insérer toutes les deux.
-- Cette contrainte d'exclusion rend le double-booking IMPOSSIBLE,
-- quel que soit le code appelant.
--
-- ⚠️  AVANT d'exécuter : si des RDV existants se chevauchent déjà,
--     la contrainte échouera. Détectez-les avec :
--
--     select a.id, b.id, a.staff_id, a.date,
--            a.start_time, a.duration, b.start_time, b.duration
--     from rdvs a
--     join rdvs b on a.staff_id = b.staff_id
--                and a.date = b.date
--                and a.id < b.id
--     where a.status not in ('cancelled','no-show')
--       and b.status not in ('cancelled','no-show')
--       and (a.date + a.start_time::time)
--           < (b.date + b.start_time::time) + make_interval(mins => b.duration)
--       and (a.date + a.start_time::time) + make_interval(mins => a.duration)
--           > (b.date + b.start_time::time);
--
--     Corrigez/annulez les doublons, puis exécutez ce fichier.
-- ─────────────────────────────────────────────────────────────

create extension if not exists btree_gist;

alter table public.rdvs
  add constraint rdvs_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tsrange(
      (date + start_time::time),
      (date + start_time::time) + make_interval(mins => duration),
      '[)'
    ) with &&
  )
  where (status not in ('cancelled', 'no-show'));
