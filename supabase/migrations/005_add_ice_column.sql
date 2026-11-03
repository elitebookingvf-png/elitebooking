-- 005_add_ice_column.sql
-- Adds the ICE (Identifiant Commun de l'Entreprise) column collected during
-- pro registration. Code degrades gracefully without it, but running this
-- makes the field actually persist.
alter table public.salons
  add column if not exists ice text;
