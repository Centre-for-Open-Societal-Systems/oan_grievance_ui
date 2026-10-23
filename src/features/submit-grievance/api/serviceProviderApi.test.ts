import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchServiceProviders } from './serviceProviderApi';

describe('searchServiceProviders', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('queries /v1/service-providers with search and page_size', async () => {
    const backendReply = {
      data: {
        items: [
          { id: 'SP-1', name: 'Alpha Union', type: 'cooperative', parent: null, area: null },
        ],
      },
      status: 'success',
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => backendReply,
    } as Response);

    const result = await searchServiceProviders('Alpha');

    expect(result).toEqual(backendReply.data.items);
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain('/api/proxy/v1/service-providers?page_size=20&search=Alpha');
  });

  it('omits search parameter if query length is below threshold', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { items: [] }, status: 'success' }),
    } as Response);

    await searchServiceProviders('a');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(String(url)).toContain('/api/proxy/v1/service-providers?page_size=20');
    expect(String(url)).not.toContain('search=');
  });
});
