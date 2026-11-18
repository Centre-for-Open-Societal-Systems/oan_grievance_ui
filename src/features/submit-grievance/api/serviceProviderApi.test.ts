import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchApi } = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock('@/lib/api/fetchApi', () => ({ fetchApi }));

import { MIN_PROVIDER_SEARCH_LENGTH, searchServiceProviders } from './serviceProviderApi';

const OPTION = {
  id: 'SP-0001',
  name: 'Basona Cooperative',
  type: 'Cooperative',
  parent: null,
  area: null,
};

function requestedParams(): URLSearchParams {
  const url = fetchApi.mock.calls[0]?.[0] as string;
  expect(url.startsWith('/api/v1/service-providers?')).toBe(true);
  return new URLSearchParams(url.split('?')[1]);
}

describe('searchServiceProviders', () => {
  beforeEach(() => {
    fetchApi.mockReset();
    fetchApi.mockResolvedValue({ items: [OPTION] });
  });

  it('sends the trimmed search text and a page size of 20', async () => {
    await searchServiceProviders('  Basona ');

    const params = requestedParams();
    expect(params.get('search')).toBe('Basona');
    expect(params.get('page_size')).toBe('20');
  });

  it('lists unfiltered when the text is shorter than the backend minimum', async () => {
    await searchServiceProviders('B');
    expect('B'.length).toBeLessThan(MIN_PROVIDER_SEARCH_LENGTH);
    expect(requestedParams().has('search')).toBe(false);
  });

  it('treats whitespace-only text as no search', async () => {
    await searchServiceProviders('     ');
    expect(requestedParams().has('search')).toBe(false);
  });

  it('searches once the text reaches the minimum length', async () => {
    await searchServiceProviders('Ba');
    expect(requestedParams().get('search')).toBe('Ba');
  });

  it('passes the abort signal and a timeout longer than the 15 s default', async () => {
    const controller = new AbortController();
    await searchServiceProviders('Basona', controller.signal);

    const [, init, timeout] = fetchApi.mock.calls[0] ?? [];
    expect(init).toEqual({ signal: controller.signal });
    expect(timeout).toBeGreaterThan(15000);
  });

  it('returns the listed providers', async () => {
    await expect(searchServiceProviders('Basona')).resolves.toEqual([OPTION]);
  });

  it('returns an empty list when the response has no items', async () => {
    fetchApi.mockResolvedValue({});
    await expect(searchServiceProviders('Basona')).resolves.toEqual([]);
  });

  it('lets a failed request reject so the dropdown can show its error', async () => {
    fetchApi.mockRejectedValue(new Error('boom'));
    await expect(searchServiceProviders('Basona')).rejects.toThrow('boom');
  });
});
