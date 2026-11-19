import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdministrativeArea } from '@/features/metadata';

const { fetchAdministrativeAreas } = vi.hoisted(() => ({ fetchAdministrativeAreas: vi.fn() }));
vi.mock('@/features/metadata', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/metadata')>()),
  fetchAdministrativeAreas,
}));

import { matchFarmerAreas } from './matchFarmerAreas';

const area = (id: string, name: string, level: string): AdministrativeArea => ({
  area_id: id,
  area_name: name,
  code: id,
  path_code: `ET.${id}`,
  level_name: level,
  is_group: 0,
  depth: 1,
});

const NAMES = { region: 'Amhara', zone: 'North Shewa', woreda: 'Basona', kebele: 'Kebele 01' };

/** Answers each level's search from a table keyed by `level_name`. */
function respondWith(byLevel: Record<string, AdministrativeArea[]>) {
  fetchAdministrativeAreas.mockImplementation(async ({ level_name }: { level_name: string }) => ({
    areas: byLevel[level_name] ?? [],
    count: (byLevel[level_name] ?? []).length,
  }));
}

beforeEach(() => {
  fetchAdministrativeAreas.mockReset();
});

describe('matchFarmerAreas', () => {
  it('matches every level, searching each under the one above it', async () => {
    respondWith({
      Region: [area('r1', 'Amhara', 'Region')],
      Zone: [area('z1', 'North Shewa', 'Zone')],
      Woreda: [area('w1', 'Basona', 'Woreda')],
      Kebele: [area('k1', 'Kebele 01', 'Kebele')],
    });

    const result = await matchFarmerAreas(NAMES);

    expect(result).toEqual({
      region: { id: 'r1', name: 'Amhara', pathCode: 'ET.r1' },
      zone: { id: 'z1', name: 'North Shewa', pathCode: 'ET.z1' },
      woreda: { id: 'w1', name: 'Basona', pathCode: 'ET.w1' },
      kebele: { id: 'k1', name: 'Kebele 01', pathCode: 'ET.k1' },
    });
    expect(fetchAdministrativeAreas.mock.calls.map(([q]) => q)).toEqual([
      { level_name: 'Region', parent: undefined, search: 'Amhara' },
      { level_name: 'Zone', parent: 'r1', search: 'North Shewa' },
      { level_name: 'Woreda', parent: 'z1', search: 'Basona' },
      { level_name: 'Kebele', parent: 'w1', search: 'Kebele 01' },
    ]);
  });

  it('compares names ignoring case and surrounding spaces', async () => {
    respondWith({ Region: [area('r1', 'AMHARA', 'Region')] });
    const result = await matchFarmerAreas({ region: '  amhara ', zone: null, woreda: null, kebele: null });
    expect(result.region?.id).toBe('r1');
  });

  it('ignores partial search hits: only an exact name counts', async () => {
    respondWith({ Region: [area('r1', 'Amhara Special', 'Region')] });
    await expect(matchFarmerAreas(NAMES)).resolves.toEqual({});
  });

  it('stops at an ambiguous level, keeping the ones above it', async () => {
    respondWith({
      Region: [area('r1', 'Amhara', 'Region')],
      Zone: [area('z1', 'North Shewa', 'Zone'), area('z2', 'North Shewa', 'Zone')],
    });

    const result = await matchFarmerAreas(NAMES);

    expect(Object.keys(result)).toEqual(['region']);
    expect(fetchAdministrativeAreas).toHaveBeenCalledTimes(2);
  });

  it('stops at a level with no match', async () => {
    respondWith({ Region: [area('r1', 'Amhara', 'Region')] });
    const result = await matchFarmerAreas(NAMES);
    expect(Object.keys(result)).toEqual(['region']);
  });

  it('skips a level the registry has no name for and searches the next under the last match', async () => {
    respondWith({
      Region: [area('r1', 'Amhara', 'Region')],
      Woreda: [area('w1', 'Basona', 'Woreda')],
    });

    const result = await matchFarmerAreas({ region: 'Amhara', zone: ' ', woreda: 'Basona', kebele: null });

    expect(Object.keys(result)).toEqual(['region', 'woreda']);
    expect(fetchAdministrativeAreas).toHaveBeenLastCalledWith({ level_name: 'Woreda', parent: 'r1', search: 'Basona' });
  });

  it('does not search below a region it could not name', async () => {
    const result = await matchFarmerAreas({ region: null, zone: 'North Shewa', woreda: 'Basona', kebele: null });
    expect(result).toEqual({});
    expect(fetchAdministrativeAreas).not.toHaveBeenCalled();
  });

  it('copes with a response that has no areas', async () => {
    fetchAdministrativeAreas.mockResolvedValue({});
    await expect(matchFarmerAreas(NAMES)).resolves.toEqual({});
  });

  it('lets a failed lookup reject (the caller treats it as "no match")', async () => {
    fetchAdministrativeAreas.mockRejectedValue(new Error('down'));
    await expect(matchFarmerAreas(NAMES)).rejects.toThrow('down');
  });
});
