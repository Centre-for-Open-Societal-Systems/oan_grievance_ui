import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchApi } = vi.hoisted(() => ({ fetchApi: vi.fn() }));
vi.mock('@/lib/api/fetchApi', () => ({ fetchApi }));

import { fetchFarmerDetails, searchFarmer } from './farmerSearchApi';

beforeEach(() => {
  fetchApi.mockReset();
});

describe('searchFarmer', () => {
  it('queries by Fayda ID and maps the registry record', async () => {
    fetchApi.mockResolvedValue({
      farmer: { registry_id: 'REG-1', fayda_id: '1234567890123456', submitter_name: 'Abebe Bikila' },
    });

    await expect(searchFarmer('1234567890123456')).resolves.toEqual({
      registryId: 'REG-1',
      faydaId: '1234567890123456',
      name: 'Abebe Bikila',
    });
    expect(fetchApi).toHaveBeenCalledWith('/api/v1/submitters/search?fayda_id=1234567890123456', { method: 'GET' });
  });

  it('maps a missing name to null', async () => {
    fetchApi.mockResolvedValue({ farmer: { registry_id: 'REG-1', fayda_id: '1234567890123456' } });
    await expect(searchFarmer('1234567890123456')).resolves.toMatchObject({ name: null });
  });

  it('rejects a response that is not a farmer record', async () => {
    fetchApi.mockResolvedValue({ farmer: { fayda_id: '1234567890123456' } });
    await expect(searchFarmer('1234567890123456')).rejects.toThrow();
  });

  it('lets a failed request reject', async () => {
    fetchApi.mockRejectedValue(new Error('404'));
    await expect(searchFarmer('1234567890123456')).rejects.toThrow('404');
  });
});

describe('fetchFarmerDetails', () => {
  it('queries by registry id (encoded) and maps the details', async () => {
    fetchApi.mockResolvedValue({
      farmer: {
        contact_mobile: '+251911234567',
        contact_email: 'a@example.com',
        region: 'Amhara',
        zone: 'North Shewa',
        woreda: 'Basona',
        kebele: 'Kebele 01',
      },
    });

    await expect(fetchFarmerDetails('REG 1/2')).resolves.toEqual({
      mobile: '+251911234567',
      email: 'a@example.com',
      region: 'Amhara',
      zone: 'North Shewa',
      woreda: 'Basona',
      kebele: 'Kebele 01',
    });
    expect(fetchApi).toHaveBeenCalledWith('/api/v1/submitters/search/details?registry_id=REG%201%2F2', {
      method: 'GET',
    });
  });

  it('turns fields the registry lacks (missing or null) into null', async () => {
    fetchApi.mockResolvedValue({ farmer: { contact_mobile: null, region: 'Amhara' } });
    await expect(fetchFarmerDetails('REG-1')).resolves.toEqual({
      mobile: null,
      email: null,
      region: 'Amhara',
      zone: null,
      woreda: null,
      kebele: null,
    });
  });
});
