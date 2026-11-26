import { ApiRequestInfo, apiCacheHeaders } from './api-cache-headers';

function request(overrides: Partial<ApiRequestInfo> = {}): ApiRequestInfo {
  return { method: 'GET', path: '/products', hasAuthorization: false, status: 200, ...overrides };
}

function isShared(info: ApiRequestInfo): boolean {
  return 'Vercel-CDN-Cache-Control' in apiCacheHeaders(info).headers;
}

describe('apiCacheHeaders', () => {
  it('lets the CDN keep anonymous catalogue reads', () => {
    for (const path of ['/products', '/products/', '/products/12', '/categories']) {
      const result = apiCacheHeaders(request({ path }));

      expect(result.headers['Vercel-CDN-Cache-Control']).toBe(
        'max-age=60, stale-while-revalidate=604800',
      );
      expect(result.headers['Cache-Control']).toBe('public, max-age=0, must-revalidate');
      expect(result.headers['Vercel-Cache-Tag']).toBe('api-catalog');
      expect(result.varyOnAuthorization).toBe(true);
    }
    expect(isShared(request({ method: 'HEAD' }))).toBe(true);
  });

  it('never shares a request that carries a token, since it may include prices', () => {
    const result = apiCacheHeaders(request({ hasAuthorization: true }));

    expect(result.headers).toEqual({ 'Cache-Control': 'private, no-store' });
    expect(result.varyOnAuthorization).toBe(false);
  });

  it('does not share anything but a 200', () => {
    for (const status of [304, 400, 404, 500, 503]) {
      expect(isShared(request({ status }))).toBe(false);
    }
  });

  it('does not share writes', () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      expect(isShared(request({ method }))).toBe(false);
    }
  });

  it('does not share paths outside the public catalogue', () => {
    for (const path of ['/health', '/auth/login', '/upload', '/products/abc', '/products/1/x']) {
      expect(isShared(request({ path }))).toBe(false);
    }
  });
});
