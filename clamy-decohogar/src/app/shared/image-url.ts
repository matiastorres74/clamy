import { environment } from '../../environments/environment';

// Product photos are stored as uploaded: iPhone JPEGs of 1179x2096 and PNGs
// of up to 3MB, shown in cards ~180px wide on a phone. Vercel's Image
// Optimization resizes and re-encodes them (AVIF/WebP) at the edge and caches
// the result. These widths must match `images.sizes` in vercel.json, or the
// endpoint answers 400.
export const IMAGE_WIDTHS = [128, 384, 640, 1080, 1600] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

const QUALITY = 75;
// Only the Blob store is listed in vercel.json's remotePatterns; anything else
// is passed through untouched rather than turned into a URL that would fail.
const OPTIMIZABLE_HOST = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//;

function canOptimize(src: string): boolean {
  // /_vercel/image only exists on Vercel. `ng serve` uses the development
  // environment, so local work keeps loading the originals.
  return environment.production && OPTIMIZABLE_HOST.test(src);
}

/** One resized copy of `src`, for an image shown at a known pixel width. */
export function imageSrc(src: string, width: ImageWidth): string {
  if (!canOptimize(src)) return src;
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=${QUALITY}`;
}

/**
 * A srcset for `src` at every width up to `maxWidth`, so the browser picks the
 * smallest copy that covers the rendered size times the screen density.
 * Empty when the image cannot be optimized, which leaves `src` in charge.
 */
export function imageSrcset(src: string, maxWidth: ImageWidth = 1600): string {
  if (!canOptimize(src)) return '';
  return IMAGE_WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${imageSrc(src, w)} ${w}w`)
    .join(', ');
}
