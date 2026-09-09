-- Enables accent-insensitive product search. Postgres LIKE/ILIKE compares
-- accented characters literally, so a shopper typing "lampara" never matched
-- "Lámpara colgante Nordic". unaccent() folds the accents on both sides of the
-- comparison; see the search branch in src/routes/products.ts.
CREATE EXTENSION IF NOT EXISTS unaccent;
