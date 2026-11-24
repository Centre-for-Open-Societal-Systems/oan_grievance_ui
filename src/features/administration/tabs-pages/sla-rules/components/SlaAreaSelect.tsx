"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchAdministrativeAreaAncestors, useAreas, type AreaLevel } from '@/features/metadata';

const LEVELS: readonly AreaLevel[] = ['Region', 'Zone', 'Woreda', 'Kebele'];

type Chosen = Record<AreaLevel, string>;

const NONE: Chosen = { Region: '', Zone: '', Woreda: '', Kebele: '' };

interface SlaAreaSelectProps {
  /** The rule's area (an area id), or '' for everywhere. */
  value: string;
  /** Called with the narrowest area chosen, or '' when none is. */
  onChange: (areaId: string) => void;
  disabled?: boolean;
  className: string;
}

function AreaLevelSelect({
  level,
  parent,
  value,
  disabled,
  className,
  onSelect,
}: {
  level: AreaLevel;
  parent: string;
  value: string;
  disabled?: boolean;
  className: string;
  onSelect: (areaId: string) => void;
}) {
  const t = useTranslations('admin.slaRules');
  const { areas, isLoading } = useAreas({ level, parents: parent ? [parent] : [] });
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {t(`area${level}`)}
      <select value={value} disabled={disabled || (level !== 'Region' && !parent) || isLoading} onChange={(e) => onSelect(e.target.value)} className={className}>
        <option value="">{level === 'Region' ? t('everywhere') : t('anyArea')}</option>
        {areas.map((area) => (
          <option key={area.area_id} value={area.area_id}>{area.area_name}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * Region → Zone → Woreda → Kebele dropdowns. Each lists the areas under the one above it; the
 * narrowest one chosen is the rule's area, and it covers every area inside it. Leave them all
 * blank for everywhere.
 */
export function SlaAreaSelect({ value, onChange, disabled, className }: SlaAreaSelectProps) {
  const [chosen, setChosen] = useState<Chosen>(NONE);

  // Opening a rule that already has an area: show the chain down to it.
  useEffect(() => {
    if (!value) return;
    const controller = new AbortController();
    fetchAdministrativeAreaAncestors(value, { signal: controller.signal })
      .then((data) => {
        const next = { ...NONE };
        for (const node of data.breadcrumbs) {
          if (LEVELS.includes(node.level_name as AreaLevel)) next[node.level_name as AreaLevel] = node.area_id;
        }
        setChosen(next);
      })
      .catch(() => undefined);
    return () => controller.abort();
    // Only the area the form opened with: later changes come from these selects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (level: AreaLevel, areaId: string) => {
    const next = { ...chosen, [level]: areaId };
    // A narrower area belongs to the old parent, so it can no longer be right.
    for (const narrower of LEVELS.slice(LEVELS.indexOf(level) + 1)) next[narrower] = '';
    setChosen(next);
    onChange([...LEVELS].reverse().map((l) => next[l]).find(Boolean) ?? '');
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {LEVELS.map((level, index) => (
        <AreaLevelSelect
          key={level}
          level={level}
          parent={index === 0 ? '' : chosen[LEVELS[index - 1] as AreaLevel]}
          value={chosen[level]}
          disabled={disabled}
          className={className}
          onSelect={(areaId) => select(level, areaId)}
        />
      ))}
    </div>
  );
}
