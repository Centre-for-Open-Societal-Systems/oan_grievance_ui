'use client';

import { useEffect, useState } from 'react';
import { fetchRoleLevels } from '../api/officerApi';
import type { OfficerLevel } from '../types';

export interface RoleLevel {
  /** `L<rank>`, as the officer API numbers it. */
  level: OfficerLevel;
  name: string;
}

export interface RoleLevels {
  levels: RoleLevel[];
  /** The top rung — the department head — or null until the chain is known. */
  headLevel: OfficerLevel | null;
  isLoading: boolean;
}

// Used when the chain can't be loaded: the three-rung chain that predates the zonal rung.
const FALLBACK_HEAD_LEVEL: OfficerLevel = 'L3';

// The chain changes rarely and every screen here needs it, so it is fetched once per page load.
let pending: Promise<RoleLevel[]> | null = null;

function loadRoleLevels(): Promise<RoleLevel[]> {
  pending ??= fetchRoleLevels()
    .then((data) =>
      [...data.role_levels]
        .sort((a, b) => a.level_order - b.level_order)
        .map((rung, index) => ({ level: `L${index + 1}` as OfficerLevel, name: rung.level_name }))
    )
    .catch((err: unknown) => {
      pending = null;
      throw err;
    });
  return pending;
}

/**
 * The escalation chain as the officer API numbers it: active rungs sorted by `level_order`,
 * `L1` first, the last being the department head. Both this endpoint and the officer API read
 * only active rungs, so the ranks agree. If the chain can't be loaded the head falls back to
 * L3 rather than leaving the Admin tab empty.
 */
export function useRoleLevels(): RoleLevels {
  const [levels, setLevels] = useState<RoleLevel[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRoleLevels()
      .then((chain) => {
        if (!cancelled) setLevels(chain);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (levels) return { levels, headLevel: levels.at(-1)?.level ?? FALLBACK_HEAD_LEVEL, isLoading: false };
  return { levels: [], headLevel: failed ? FALLBACK_HEAD_LEVEL : null, isLoading: !failed };
}
