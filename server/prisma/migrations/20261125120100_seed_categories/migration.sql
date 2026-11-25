-- The five categories that used to be hard-coded, with the same ids so every
-- existing product keeps its category, plus Navidad for the season. Kept in
-- its own migration so tests/setup.ts can replay it after `db push`.
INSERT INTO "Category" ("id", "label", "position") VALUES
    ('christmas', 'Navidad', 0),
    ('furniture', 'Muebles', 1),
    ('lighting', 'Iluminación', 2),
    ('decoration', 'Decoración', 3),
    ('kitchen', 'Cocina', 4),
    ('everyday-use', 'Varios', 5)
ON CONFLICT ("id") DO NOTHING;
