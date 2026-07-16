import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchEnglishPage } from './fetchEnglishPage';

describe('fetchEnglishPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses site credentials without forwarding them through redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://developer.android.com/docs?hl=en',
      headers: new Headers({ 'last-modified': 'Fri, 16 Jan 2026 00:00:00 GMT' }),
      text: vi.fn().mockResolvedValue('<html lang="en"></html>'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchEnglishPage('https://developer.android.com/docs?hl=en', 'google-devsite'),
    ).resolves.toEqual({
      html: '<html lang="en"></html>',
      lastModified: 'Fri, 16 Jan 2026 00:00:00 GMT',
      url: 'https://developer.android.com/docs?hl=en',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://developer.android.com/docs?hl=en'),
      {
        credentials: 'include',
        redirect: 'error',
        headers: { Accept: 'text/html,application/xhtml+xml' },
      },
    );
  });
});
