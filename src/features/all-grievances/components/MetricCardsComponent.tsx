import React from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle,
  CircleDashed,
  HelpCircle,
  Layers,
  Loader2,
  UserCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { GrievanceSummaryCard } from '../types';

/**
 * Icons are keyed by the summary card's status (then label), never by array index.
 * Labels and counts always come from the API.
 */
type MetricVisual = {
  key: string;
  Icon: LucideIcon;
  iconClassName: string;
  bgColor: string;
};

const METRIC_CARD_VISUALS: Record<string, MetricVisual> = {
  all: {
    key: 'all',
    Icon: Layers,
    iconClassName:
      'text-blue-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-blue-50',
  },
  assigned: {
    key: 'assigned',
    Icon: UserCheck,
    iconClassName:
      'text-sky-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-sky-50',
  },
  'in progress': {
    key: 'in-progress',
    Icon: Loader2,
    iconClassName:
      'text-indigo-600 w-10 h-10 transition-transform duration-500 ease-in-out group-hover:rotate-[180deg]',
    bgColor: 'bg-indigo-50',
  },
  'require more info': {
    key: 'require-more-info',
    Icon: HelpCircle,
    iconClassName:
      'text-orange-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-orange-50',
  },
  rejected: {
    key: 'rejected',
    Icon: XCircle,
    iconClassName:
      'text-red-600 w-10 h-10 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1',
    bgColor: 'bg-red-50',
  },
  resolved: {
    key: 'resolved',
    Icon: CheckCircle,
    iconClassName:
      'text-green-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12',
    bgColor: 'bg-green-50',
  },
  closed: {
    key: 'closed',
    Icon: Archive,
    iconClassName:
      'text-slate-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-slate-50',
  },
};

/** Workflow labels that share a queue card's visual. */
const STATUS_ALIASES: Record<string, string> = {
  'more info needed': 'require more info',
};

const FALLBACK_VISUAL: MetricVisual = {
  key: 'fallback',
  Icon: CircleDashed,
  iconClassName: 'text-gray-400 w-10 h-10',
  bgColor: 'bg-gray-50',
};

function normalizeStatusKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function lookupVisual(value: string): MetricVisual | undefined {
  const key = normalizeStatusKey(value);
  return METRIC_CARD_VISUALS[key] ?? METRIC_CARD_VISUALS[STATUS_ALIASES[key] ?? ''];
}

function visualForCard(card: GrievanceSummaryCard): MetricVisual {
  return lookupVisual(card.status) ?? lookupVisual(card.label) ?? FALLBACK_VISUAL;
}

export function MetricCardsComponent({
  cards,
  isLoading = false,
  error,
  onRetry,
}: {
  cards: GrievanceSummaryCard[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  if (isLoading && cards.length === 0) {
    return (
      <div
        role="status"
        aria-label="Loading grievance summary"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-white p-4 border border-[#F1F3F4] rounded-xl animate-pulse flex flex-col justify-between min-h-[108px]"
          >
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="mt-6 h-7 w-12 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="bg-white border border-red-100 shadow-sm rounded-xl p-6 flex flex-col items-center text-center"
      >
        <div className="bg-red-50 p-4 rounded-full flex items-center justify-center text-red-500 mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold text-gray-900">Could not load grievance summary</p>
        <p className="text-sm text-gray-500 mt-2 max-w-md leading-relaxed">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all hover:shadow-sm"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const visual = visualForCard(card);
        const Icon = visual.Icon;
        return (
          <MetricCard
            key={`${card.status}-${card.order}`}
            title={card.label}
            count={card.count ?? 0}
            bgColor={visual.bgColor}
            visualKey={visual.key}
            icon={<Icon className={visual.iconClassName} />}
          />
        );
      })}
    </div>
  );
}

function MetricCard({
  title,
  count,
  icon,
  bgColor,
  visualKey,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  visualKey: string;
}) {
  return (
    <div className="bg-white p-4 shadow-sm flex flex-col justify-between cursor-default border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl group">
      <div className="text-md font-semibold text-gray-500">{title}</div>
      <div className="flex items-end justify-between">
        <span className="text-[28px] leading-none font-bold text-gray-900">{count}</span>
        <div
          data-visual={visualKey}
          className={`p-3.5 rounded-2xl ${bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
