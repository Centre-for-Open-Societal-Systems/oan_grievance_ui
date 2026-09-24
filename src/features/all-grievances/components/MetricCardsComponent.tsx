import React from 'react';
import { Layers, Loader2, HelpCircle, XCircle, CheckCircle, Archive } from 'lucide-react';
import type { GrievanceSummaryCard } from '../types';

/**
 * Visuals are keyed by display order from the summary API (same order as backend cards).
 * Labels and counts always come from the API — never hard-coded here.
 */
const METRIC_CARD_VISUALS = [
  {
    icon: (
      <Layers className="text-blue-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
    ),
    bgColor: 'bg-blue-50',
  },
  {
    icon: (
      <Loader2 className="text-indigo-600 w-10 h-10 transition-transform duration-500 ease-in-out group-hover:rotate-[180deg]" />
    ),
    bgColor: 'bg-indigo-50',
  },
  {
    icon: (
      <HelpCircle className="text-orange-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
    ),
    bgColor: 'bg-orange-50',
  },
  {
    icon: (
      <XCircle className="text-red-600 w-10 h-10 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1" />
    ),
    bgColor: 'bg-red-50',
  },
  {
    icon: (
      <CheckCircle className="text-green-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
    ),
    bgColor: 'bg-green-50',
  },
  {
    icon: (
      <Archive className="text-slate-600 w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
    ),
    bgColor: 'bg-slate-50',
  },
] as const;

const FALLBACK_VISUAL = METRIC_CARD_VISUALS[0];

export function MetricCardsComponent({ cards }: { cards: GrievanceSummaryCard[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const visual = METRIC_CARD_VISUALS[index] ?? FALLBACK_VISUAL;
        return (
          <MetricCard
            key={`${card.status}-${card.order}`}
            title={card.label}
            count={card.count ?? 0}
            icon={visual.icon}
            bgColor={visual.bgColor}
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
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white p-4 shadow-sm flex flex-col justify-between cursor-default border border-[#F1F3F4] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05),0px_2px_4px_-1px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-xl group">
      <div className="text-md font-semibold text-gray-500">{title}</div>
      <div className="flex items-end justify-between">
        <span className="text-[28px] leading-none font-bold text-gray-900">{count}</span>
        <div
          className={`p-3.5 rounded-2xl ${bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
