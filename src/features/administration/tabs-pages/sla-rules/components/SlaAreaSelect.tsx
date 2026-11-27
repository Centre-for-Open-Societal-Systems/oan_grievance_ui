"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchAdministrativeAreaAncestors, useAreas, type AreaLevel } from '@/features/metadata';

const LEVELS: readonly AreaLevel[] = ['Region', 'Zone', 'Woreda', 'Kebele'];

type Chosen = Record<AreaLevel, string>;

const NONE: Chosen = { Region: '', Zone: '', Woreda: '', Kebele: '' };

/** The saved area's chain, so a level whose list lacks its area (a list cut short) still shows it. */
type ChosenNames = Partial<Record<AreaLevel, string>>;

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
  valueName,
  disabled,
  className,
  onSelect,
}: {
  level: AreaLevel;
  parent: string;
  value: string;
  valueName?: string;
  disabled?: boolean;
  className: string;
  onSelect: (areaId: string) => void;
}) {
  const t = useTranslations('admin.slaRules');
  const { areas, isLoading, isError, isTruncated, refetch } = useAreas({ level, parents: parent ? [parent] : [] });
  const missing = value && !areas.some((area) => area.area_id === value);
  return (
    <div className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      <label className="flex flex-col gap-1">
        {t(`area${level}`)}
        <select value={value} disabled={disabled || (level !== 'Region' && !parent) || isLoading} onChange={(e) => onSelect(e.target.value)} className={className}>
          <option value="">{level === 'Region' ? t('everywhere') : t('anyArea')}</option>
          {missing && <option value={value}>{valueName ?? value}</option>}
          {areas.map((area) => (
            <option key={area.area_id} value={area.area_id}>{area.area_name}</option>
          ))}
        </select>
      </label>
      {isError ? (
        <span role="alert" className="text-red-600">
          {t('areaLoadFailed')}{' '}
          <button type="button" onClick={refetch} className="underline font-semibold">{t('retry')}</button>
        </span>
      ) : (
        isTruncated && <span className="text-gray-500">{t('areaTruncated', { count: areas.length })}</span>
      )}
    </div>
  );
}

/**
 * Region → Zone → Woreda → Kebele dropdowns. Each lists the areas under the one above it; the
 * narrowest one chosen is the rule's area, and it covers every area inside it. Leave them all
 * blank for everywhere.
 */
export function SlaAreaSelect({ value, onChange, disabled, className }: SlaAreaSelectProps) {
  const t = useTranslations('admin.slaRules');
  const [chosen, setChosen] = useState<Chosen>(NONE);
  const [names, setNames] = useState<ChosenNames>({});
  // The area the form opened with, until its chain is shown: the selects read "Everywhere" meanwhile.
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'failed'>(value ? 'loading' : 'idle');
  const [attempt, setAttempt] = useState(0);
  const [initial] = useState(value);

  // Opening a rule that already has an area: show the chain down to it.
  useEffect(() => {
    if (!initial) return;
    const controller = new AbortController();
    fetchAdministrativeAreaAncestors(initial, { signal: controller.signal })
      .then((data) => {
        const next = { ...NONE };
        const nextNames: ChosenNames = {};
        for (const node of data.breadcrumbs) {
          if (!LEVELS.includes(node.level_name as AreaLevel)) continue;
          next[node.level_name as AreaLevel] = node.area_id;
          nextNames[node.level_name as AreaLevel] = node.area_name;
        }
        setChosen(next);
        setNames(nextNames);
        setLookup('idle');
      })
      .catch(() => {
        if (!controller.signal.aborted) setLookup('failed');
      });
    return () => controller.abort();
  }, [initial, attempt]);

  const select = (level: AreaLevel, areaId: string) => {
    // Picking an area replaces the one the form opened with, so its lookup no longer matters.
    setLookup('idle');
    const next = { ...chosen, [level]: areaId };
    // A narrower area belongs to the old parent, so it can no longer be right.
    for (const narrower of LEVELS.slice(LEVELS.indexOf(level) + 1)) next[narrower] = '';
    setChosen(next);
    onChange([...LEVELS].reverse().map((l) => next[l]).find(Boolean) ?? '');
  };

  return (
    <div className="flex flex-col gap-2">
      {lookup === 'failed' && (
        <p role="alert" className="text-xs text-red-600">
          {t('areaLookupFailed', { area: initial })}{' '}
          <button
            type="button"
            onClick={() => {
              setLookup('loading');
              setAttempt((n) => n + 1);
            }}
            className="underline font-semibold"
          >
            {t('retry')}
          </button>
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {LEVELS.map((level, index) => (
          <AreaLevelSelect
            key={level}
            level={level}
            parent={index === 0 ? '' : chosen[LEVELS[index - 1] as AreaLevel]}
            value={chosen[level]}
            valueName={names[level]}
            disabled={disabled || lookup === 'loading'}
            className={className}
            onSelect={(areaId) => select(level, areaId)}
          />
        ))}
      </div>
    </div>
  );
}
