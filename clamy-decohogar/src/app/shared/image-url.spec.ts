import { imageSrc, imageSrcset } from './image-url';

const BLOB = 'https://abc123.public.blob.vercel-storage.com/photo.png';

describe('imageSrc', () => {
  it('routes a Blob photo through the optimizer at the requested width', () => {
    expect(imageSrc(BLOB, 640, true)).toBe(
      `/_vercel/image?url=${encodeURIComponent(BLOB)}&w=640&q=75`,
    );
  });

  it('keeps the original off Vercel', () => {
    expect(imageSrc(BLOB, 640, false)).toBe(BLOB);
  });

  it('keeps the original for hosts the optimizer does not allow', () => {
    for (const src of [
      'https://example.com/photo.png',
      'assets/hero/hero-3-640.avif',
      // A lookalike host must not pass as the Blob store.
      'https://evil.com/x.public.blob.vercel-storage.com/photo.png',
      'http://abc123.public.blob.vercel-storage.com/photo.png',
    ]) {
      expect(imageSrc(src, 640, true)).toBe(src);
    }
  });
});

describe('imageSrcset', () => {
  it('lists every allowed width up to the maximum, smallest first', () => {
    const widths = imageSrcset(BLOB, 640, true)
      .split(', ')
      .map((entry) => entry.split(' ')[1]);

    expect(widths).toEqual(['128w', '384w', '640w']);
  });

  it('defaults to every width', () => {
    expect(imageSrcset(BLOB, undefined, true).split(', ')).toHaveLength(5);
  });

  it('is empty when the photo cannot be optimized, so src stays in charge', () => {
    expect(imageSrcset(BLOB, 1080, false)).toBe('');
    expect(imageSrcset('https://example.com/photo.png', 1080, true)).toBe('');
  });
});
