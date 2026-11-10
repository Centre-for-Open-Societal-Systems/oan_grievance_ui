import { fetchAdministrativeAreas, toAreaRef, type AreaLevel, type AreaRef } from '@/features/metadata';

/** The place names the registry holds for a farmer. */
export interface FarmerPlaceNames {
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
}

export type FarmerAreas = Partial<Record<'region' | 'zone' | 'woreda' | 'kebele', AreaRef>>;

const LEVELS: ReadonlyArray<[keyof FarmerAreas, AreaLevel]> = [
  ['region', 'Region'],
  ['zone', 'Zone'],
  ['woreda', 'Woreda'],
  ['kebele', 'Kebele'],
];

const normalise = (name: string) => name.trim().toLowerCase();

/**
 * The administrative areas the registry's place names stand for, one level at a time from the
 * region down, each searched under the one before it (a woreda name repeats across regions).
 *
 * A level is set only when exactly one area has that name. Going any deeper then stops at the
 * first level that does not match, since a child cannot be trusted without its parent, so the
 * agent picks the rest. A level the registry has no name for is skipped, and the next one is
 * searched under the last match: the backend returns every descendant, not just direct children.
 */
export async function matchFarmerAreas(names: FarmerPlaceNames): Promise<FarmerAreas> {
  const matched: FarmerAreas = {};
  let parentId: string | undefined;

  for (const [key, level] of LEVELS) {
    const name = names[key];
    if (!name?.trim()) continue;
    if (key !== 'region' && !parentId) break;

    const { areas } = await fetchAdministrativeAreas({
      level_name: level,
      parent: parentId,
      search: name.trim(),
    });
    const exact = (areas ?? []).filter((area) => normalise(area.area_name) === normalise(name));
    if (exact.length !== 1) break;

    const ref = toAreaRef(exact[0]!);
    matched[key] = ref;
    parentId = ref.id;
  }
  return matched;
}
