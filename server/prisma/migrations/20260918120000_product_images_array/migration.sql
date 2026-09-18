-- Products move from a single optional photo to an ordered list of photos.
-- The old imageUrl becomes the first (cover) entry so nothing already
-- uploaded is lost; products without a photo get an empty list.
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Product" SET "images" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';
ALTER TABLE "Product" DROP COLUMN "imageUrl";
