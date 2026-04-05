-- Revierte columna opcional si existía (p. ej. entornos que aplicaron migración previa).
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "institution_name";
