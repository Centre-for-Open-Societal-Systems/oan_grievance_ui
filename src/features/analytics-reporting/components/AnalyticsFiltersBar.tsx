"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { NO_FILTERS, type AnalyticsFilterOptions, type AnalyticsFilters, type FilterOption } from "../types";
import { CARD_WHITE } from "./cardStyles";

interface FilterSelectProps {
  label: string;
  allLabel: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

function FilterSelect({ label, allLabel, options, value, onChange }: FilterSelectProps) {
  const id = useId();
  // A value that is no longer on offer is still shown, so the select never claims "all" while a filter is in force.
  const offered = options.some((option) => option.value === value) || value === "" ? options : [...options, { value, label: value }];

  return (
    <div className="flex flex-col gap-1 min-w-[180px]">
      <label htmlFor={id} className="text-xs font-semibold text-gray-600">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <option value="">{allLabel}</option>
        {offered.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface AnalyticsFiltersBarProps {
  options: AnalyticsFilterOptions;
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
}

/** Narrows every chart to one region, service category or department. A control whose list could not be loaded is left out. */
export function AnalyticsFiltersBar({ options, filters, onChange }: AnalyticsFiltersBarProps) {
  const t = useTranslations("analytics.filters");
  const { regions, categories, departments } = options;
  const anySet = filters.region !== "" || filters.serviceCategory !== "" || filters.assignedDept !== "";

  if (!regions?.length && !categories?.length && !departments?.length && !anySet) return null;

  return (
    <div role="group" aria-label={t("title")} className={`${CARD_WHITE} p-4 flex flex-wrap items-end gap-4`}>
      {regions && regions.length > 0 && (
        <FilterSelect
          label={t("region")}
          allLabel={t("allRegions")}
          options={regions}
          value={filters.region}
          onChange={(region) => onChange({ ...filters, region })}
        />
      )}
      {categories && categories.length > 0 && (
        <FilterSelect
          label={t("category")}
          allLabel={t("allCategories")}
          options={categories}
          value={filters.serviceCategory}
          onChange={(serviceCategory) => onChange({ ...filters, serviceCategory })}
        />
      )}
      {departments && departments.length > 0 && (
        <FilterSelect
          label={t("department")}
          allLabel={t("allDepartments")}
          options={departments}
          value={filters.assignedDept}
          onChange={(assignedDept) => onChange({ ...filters, assignedDept })}
        />
      )}
      {anySet && (
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {t("clear")}
        </button>
      )}
    </div>
  );
}
