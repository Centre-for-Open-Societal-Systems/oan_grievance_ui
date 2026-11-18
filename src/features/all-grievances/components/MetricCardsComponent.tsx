'use client';

import React from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Copy,
  HelpCircle,
  Inbox,
  Layers,
  Loader2,
  RotateCcw,
  UserCheck,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCarouselScroll } from '@/hooks/useCarouselScroll';
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
      'text-blue-600 w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-blue-50',
  },
  submitted: {
    key: 'submitted',
    Icon: Inbox,
    iconClassName:
      'text-cyan-600 w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-cyan-50',
  },
  assigned: {
    key: 'assigned',
    Icon: UserCheck,
    iconClassName:
      'text-sky-600 w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-sky-50',
  },
  'in progress': {
    key: 'in-progress',
    Icon: Loader2,
    iconClassName:
      'text-indigo-600 w-8 h-8 transition-transform duration-500 ease-in-out group-hover:rotate-[180deg]',
    bgColor: 'bg-indigo-50',
  },
  reopened: {
    key: 'reopened',
    Icon: RotateCcw,
    iconClassName:
      'text-amber-600 w-8 h-8 transition-transform duration-500 ease-in-out group-hover:-rotate-[180deg]',
    bgColor: 'bg-amber-50',
  },
  'require more info': {
    key: 'require-more-info',
    Icon: HelpCircle,
    iconClassName:
      'text-orange-600 w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-orange-50',
  },
  rejected: {
    key: 'rejected',
    Icon: XCircle,
    iconClassName:
      'text-red-600 w-8 h-8 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1',
    bgColor: 'bg-red-50',
  },
  resolved: {
    key: 'resolved',
    Icon: CheckCircle,
    iconClassName:
      'text-green-600 w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12',
    bgColor: 'bg-green-50',
  },
  duplicate: {
    key: 'duplicate',
    Icon: Copy,
    iconClassName:
      'text-slate-600 w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-slate-50',
  },
  closed: {
    key: 'closed',
    Icon: Archive,
    iconClassName:
      'text-slate-600 w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6',
    bgColor: 'bg-slate-50',
  },
};

/** Workflow labels that share a queue card's visual. */
const STATUS_ALIASES: Record<string, string> = {
  'more info needed': 'require more info',
  duplicates: 'duplicate',
};

const FALLBACK_VISUAL: MetricVisual = {
  key: 'fallback',
  Icon: CircleDashed,
  iconClassName: 'text-gray-400 w-8 h-8',
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

const ARROW_BUTTON_CLASS =
  'absolute top-[calc(50%-0.5rem)] z-10 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2';

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
  const t = useTranslations('grievanceList');
  const { scrollRef, activeIndex, scrollProgress, canScroll, scrollTo, handleScroll } = useCarouselScroll({
    enableWheelScroll: true,
  });
  // aria-disabled, not disabled: pressing Next to reach the last card must not drop the keyboard focus it holds.
  const atStart = scrollProgress <= 0.01;
  const atEnd = scrollProgress >= 0.99;

  if (isLoading && cards.length === 0) {
    return (
      <div
        role="status"
        aria-label="Loading grievance summary"
        className="flex gap-4 overflow-hidden pb-2 px-1"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="w-[85vw] sm:w-[280px] shrink-0 bg-white p-5 border border-[#F1F3F4] rounded-xl animate-pulse flex items-center justify-between min-h-[108px]"
          >
            <div>
              <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
              <div className="h-8 w-12 bg-gray-100 rounded" />
            </div>
            <div className="w-16 h-16 bg-gray-100 rounded-xl" />
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

  if (cards.length === 0) {
    return null;
  }

  const totalCards = cards.length;

  return (
    <div className="relative mb-2">
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        .hide-scrollbar::-webkit-scrollbar-track { display: none !important; }
        .hide-scrollbar::-webkit-scrollbar-thumb { display: none !important; }
        .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}</style>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar pb-2 px-1"
      >
        {cards.map((card) => {
          const visual = visualForCard(card);
          const Icon = visual.Icon;
          return (
            <MetricCard
              key={`${card.status}-${card.order}`}
              title={card.label}
              count={card.count ?? 0}
              breakdown={card.breakdown}
              bgColor={visual.bgColor}
              visualKey={visual.key}
              icon={<Icon className={visual.iconClassName} />}
            />
          );
        })}
      </div>

      {/* Previous / next — only when the row overflows; if every card fits there is nothing to move through. */}
      {totalCards > 1 && canScroll && (
        <>
          <button
            type="button"
            onClick={() => {
              if (!atStart) scrollTo(Math.max(0, activeIndex - 1));
            }}
            aria-disabled={atStart}
            aria-label={t('metricsPrevious')}
            className={ARROW_BUTTON_CLASS + ' left-0'}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!atEnd) scrollTo(Math.min(totalCards - 1, activeIndex + 1));
            }}
            aria-disabled={atEnd}
            aria-label={t('metricsNext')}
            className={ARROW_BUTTON_CLASS + ' right-0'}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  count,
  breakdown,
  icon,
  bgColor,
  visualKey,
}: {
  title: string;
  count: number;
  /** The parts the count is made of, listed under it. */
  breakdown?: GrievanceSummaryCard['breakdown'];
  icon: React.ReactNode;
  bgColor: string;
  visualKey: string;
}) {
  const titleId = React.useId();
  return (
    <div className="group w-[85vw] sm:w-[280px] shrink-0 snap-center bg-white border border-[#F1F3F4] rounded-xl p-5 flex items-center justify-between shadow-sm shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-default">
      <div>
        <p id={titleId} className="text-[14px] font-semibold text-[#6B7280] mb-1">{title}</p>
        <h4 className="text-[32px] font-bold text-[#1F2937] leading-none">{count}</h4>
        {breakdown && breakdown.length > 0 && (
          <ul aria-labelledby={titleId} className="mt-3 space-y-1 border-t border-[#F1F3F4] pt-2.5">
            {breakdown.map((part) => (
              <li key={part.label} className="flex items-center justify-between gap-6 text-[13px] text-[#6B7280]">
                <span>{part.label}</span>
                <span className="font-bold text-[#374151]">{part.count ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div
        data-visual={visualKey}
        className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-md ${bgColor}`}
      >
        {icon}
      </div>
    </div>
  );
}
