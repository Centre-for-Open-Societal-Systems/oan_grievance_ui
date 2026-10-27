"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { UseAdminLevelsResult } from "../hooks/useAdminLevels";
import type { AdminAreaStat } from "../types";
import { CARD_WHITE } from "./cardStyles";
import { SectionUnavailable } from "./SectionUnavailable";

/** Rows listed per level; the rest are counted in a "+N more" line so the card stays short. */
const LIST_LIMIT = 8;

interface AdminLevelCardProps {
  levels: UseAdminLevelsResult;
  /** The region the dashboard is narrowed to, if any. */
  selectedRegion: string | null;
  onSelectRegion: (code: string | null) => void;
}

function AreaBar({ area, max }: { area: AdminAreaStat; max: number }) {
  const format = useFormatter();
  return (
    <>
      <span className="flex justify-between text-[14px] font-semibold text-[#0D1117]">
        <span>{area.name}</span>
        <span>{format.number(area.value)}</span>
      </span>
      <span className="block w-full bg-[#f3f4f6] rounded-full h-[6px] overflow-hidden mt-2">
        <span
          className="block h-full rounded-full bg-[#2563eb]"
          style={{ width: `${(area.value / max) * 100}%` }}
        />
      </span>
    </>
  );
}

/**
 * Grievance counts by administrative level. Picking a region narrows the rest of the
 * dashboard to it and lists its woredas. The service sends only the levels the caller may
 * read, so a woreda officer sees woredas alone and nothing here filters by role.
 */
export function AdminLevelCard({ levels, selectedRegion, onSelectRegion }: AdminLevelCardProps) {
  const t = useTranslations("dashboard.overview.levels");
  const format = useFormatter();

  if (levels.status === "loading") {
    return (
      <div role="status" className={`${CARD_WHITE} p-6 text-sm text-gray-500`}>
        {t("loading")}
      </div>
    );
  }
  if (levels.status === "error") {
    return levels.forbidden ? (
      <div role="alert" className={`${CARD_WHITE} p-6 text-sm text-red-600`}>
        {t("forbidden")}
      </div>
    ) : (
      <SectionUnavailable onRetry={levels.retry} className="min-h-[140px]" />
    );
  }

  const { federal, regions, woredas } = levels.statistics;
  const region = regions.find((r) => r.code === selectedRegion) ?? null;
  // Narrowed to the picked region's woredas, else every woreda the caller reads (the service ranks them).
  const inScope = region ? woredas.filter((w) => w.regionCode === region.code) : woredas;
  const shownWoredas = inScope.slice(0, LIST_LIMIT);
  const hiddenWoredas = inScope.length - shownWoredas.length;
  const shownRegions = regions.slice(0, LIST_LIMIT);
  const hiddenRegions = regions.length - shownRegions.length;
  const regionMax = Math.max(1, ...regions.map((r) => r.value));
  const woredaMax = Math.max(1, ...inScope.map((w) => w.value));
  const isEmpty = !federal && regions.length === 0 && woredas.length === 0;

  return (
    <section aria-labelledby="admin-level-title" className={CARD_WHITE}>
      <div className="px-6 py-5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
        <h3 id="admin-level-title" className="text-[16px] font-semibold text-[#111827] tracking-tight">
          {t("title")}
        </h3>
        {federal && (
          <p className="text-sm text-gray-600">
            {federal.name ?? t("federal")}: <strong>{format.number(federal.value)}</strong>
          </p>
        )}
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isEmpty && <p className="text-sm text-gray-500 lg:col-span-2">{t("noData")}</p>}

        {regions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">{t("regions")}</h4>
            <p className="text-xs text-gray-500 mb-3">{t("selectHint")}</p>
            <ul className="space-y-1">
              {shownRegions.map((area) => {
                const selected = area.code === selectedRegion;
                return (
                  <li key={area.code}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelectRegion(selected ? null : area.code)}
                      className={`w-full text-left rounded-lg px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#2563eb] ${
                        selected ? "bg-blue-50 ring-1 ring-[#2563eb]" : "hover:bg-gray-50"
                      }`}
                    >
                      <AreaBar area={area} max={regionMax} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {hiddenRegions > 0 && <p className="text-xs text-gray-500 mt-2 px-3">{t("more", { count: hiddenRegions })}</p>}
          </div>
        )}

        {(shownWoredas.length > 0 || region) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              {region ? t("woredasIn", { region: region.name }) : regions.length > 0 ? t("topWoredas") : t("woredas")}
            </h4>
            {shownWoredas.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noWoredas")}</p>
            ) : (
              <ul className="space-y-3">
                {shownWoredas.map((area) => (
                  <li key={area.code} className="px-3 py-1">
                    <AreaBar area={area} max={woredaMax} />
                  </li>
                ))}
              </ul>
            )}
            {hiddenWoredas > 0 && <p className="text-xs text-gray-500 mt-2 px-3">{t("more", { count: hiddenWoredas })}</p>}
          </div>
        )}
      </div>

      {region && (
        <div className="px-6 py-3 border-t border-gray-200 flex flex-wrap items-center gap-3 text-sm">
          <span role="status">{t("filteredBy", { region: region.name })}</span>
          <button type="button" onClick={() => onSelectRegion(null)} className="font-semibold underline">
            {t("clear")}
          </button>
        </div>
      )}
    </section>
  );
}
