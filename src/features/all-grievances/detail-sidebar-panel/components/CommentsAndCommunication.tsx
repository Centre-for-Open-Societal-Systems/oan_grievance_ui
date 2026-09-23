"use client";

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  MessageCircle,
  FileText,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Send,
  HelpCircle,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  XCircle,
  Paperclip,
} from 'lucide-react';
import { DocumentViewerPopup } from './DocumentViewerPopup';
import type { Grievance, GrievanceTimelineData, TimelineEntry, TimelineEventItem } from '../../types';
import { normalizeTimelineEntry, type FormattedTimelineEvent } from '../../utils/mapGrievance';

interface CommentsAndCommunicationProps {
  canManageCase: boolean;
  timelineData?: GrievanceTimelineData | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  grievance?: Grievance | null;
}

export function CommentsAndCommunication({
  canManageCase,
  timelineData,
  isLoading,
  error,
  onRetry,
  grievance,
}: CommentsAndCommunicationProps) {
  const canSeeInternal = canManageCase;
  const t = useTranslations('commentsAndCommunication');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [expandedMsgs, setExpandedMsgs] = useState<Record<string, boolean>>({});

  // Combine and normalize events from timelineData (or fallback to initial grievance submission if empty)
  const normalizedEvents = useMemo<FormattedTimelineEvent[]>(() => {
    const rawItems: Array<TimelineEntry | TimelineEventItem> =
      timelineData?.timeline || timelineData?.events || [];

    const list = rawItems.map((item, idx) => normalizeTimelineEntry(item, idx));

    // If no explicit submission event is in the timeline list but grievance description is available,
    // inject the initial intake submission event at the bottom/beginning
    const hasSubmission = list.some(
      (e) => e.entryType.toLowerCase() === 'submission' || e.typeLabel.toLowerCase() === 'submission'
    );

    if (!hasSubmission && (grievance?.description || timelineData?.summary?.description || grievance?.title)) {
      const desc =
        timelineData?.summary?.description || grievance?.description || grievance?.title || '';
      const submitterName =
        timelineData?.submitter?.name ||
        grievance?.submitterName ||
        (grievance?.isAnonymous ? 'Anonymous' : 'Grievance Submitter');
      const submitterRole =
        timelineData?.submitter?.submitter_type || grievance?.submitterType || 'Grievance Submitter';
      const createdDate = grievance?.submittedAt || '';

      list.push({
        id: 'initial-submission',
        entryType: 'submission',
        typeLabel: 'Submission',
        isInternal: false,
        body: desc,
        authorName: submitterName,
        authorRole: submitterRole,
        authorType: 'submitter',
        initials: submitterName.slice(0, 2).toUpperCase() || 'SB',
        formattedDate: createdDate,
        rawDate: createdDate,
      });
    }

    // Filter internal notes if caller is not an officer/admin
    return list.filter((e) => !e.isInternal || canSeeInternal);
  }, [timelineData, grievance, canSeeInternal]);

  const visibleMessageCount = normalizedEvents.length;

  const toggleMsg = (id: string) => {
    setExpandedMsgs((prev) => ({
      ...prev,
      // Default to expanded (true) if undefined, so clicking toggles to false
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isMsgExpanded = (id: string) => {
    return expandedMsgs[id] !== false; // Default expanded
  };

  const getBadgeStyle = (event: FormattedTimelineEvent) => {
    const type = event.entryType.toLowerCase();
    if (event.isInternal) {
      return {
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
        icon: <AlertCircle className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-amber-600 text-white',
        cardBg: 'bg-[#FFF9E5] border border-amber-200/70 text-amber-950',
      };
    }
    if (type === 'resolution' || type.includes('resol')) {
      return {
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: <CheckCircle2 className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-emerald-600 text-white',
        cardBg: 'bg-emerald-50/40 border border-emerald-100 text-gray-800',
      };
    }
    if (type === 'rejection' || type.includes('reject')) {
      return {
        badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        icon: <XCircle className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-rose-600 text-white',
        cardBg: 'bg-rose-50/40 border border-rose-100 text-gray-800',
      };
    }
    if (type === 'response' || type.includes('dept')) {
      return {
        badgeClass: 'bg-green-50 text-green-700 border border-green-200',
        icon: <FileText className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-emerald-700 text-white',
        cardBg: 'bg-green-50/50 border border-green-200/60 text-gray-800',
      };
    }
    if (type === 'status_change' || type.includes('status')) {
      return {
        badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
        icon: <TrendingUp className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-indigo-600 text-white',
        cardBg: 'bg-indigo-50/40 border border-indigo-100 text-gray-800',
      };
    }
    if (type === 'info_request') {
      return {
        badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
        icon: <HelpCircle className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-purple-700 text-white',
        cardBg: 'bg-purple-50/40 border border-purple-100 text-gray-800',
      };
    }
    if (type === 'assignment') {
      return {
        badgeClass: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
        icon: <UserCheck className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-cyan-700 text-white',
        cardBg: 'bg-cyan-50/40 border border-cyan-100 text-gray-800',
      };
    }
    if (type === 'escalation') {
      return {
        badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
        icon: <AlertCircle className="h-3 w-3 shrink-0" />,
        avatarBg: 'bg-orange-600 text-white',
        cardBg: 'bg-orange-50/40 border border-orange-100 text-gray-800',
      };
    }
    if (type === 'submission') {
      return {
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
        icon: null,
        avatarBg: 'bg-gray-800 text-white',
        cardBg: 'bg-gray-50 border border-gray-200/80 text-gray-800',
      };
    }
    // Default public message
    return {
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: <Send className="h-3 w-3 shrink-0" />,
      avatarBg: event.authorType === 'officer' ? 'bg-emerald-700 text-white' : 'bg-gray-800 text-white',
      cardBg: 'bg-gray-50 border border-gray-200 text-gray-800',
    };
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-[#F1F3F4] shadow-sm flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 inline-block">Comments & Communication</h3>
              <p className="text-sm text-gray-500">{t('messageCount', { count: visibleMessageCount })}</p>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-full">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Updating…</span>
            </div>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {error ? (
            <div className="p-6 text-center flex flex-col items-center justify-center gap-3 bg-red-50/50 rounded-xl border border-red-100">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm font-medium text-red-800">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              )}
            </div>
          ) : isLoading && normalizedEvents.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Loading timeline and communication thread…</p>
            </div>
          ) : normalizedEvents.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
              <MessageCircle className="h-10 w-10 stroke-1 text-gray-300" />
              <p className="text-sm font-medium text-gray-600">No communication activity recorded yet</p>
              <p className="text-xs text-gray-400">Public messages and officer responses will appear here chronologically.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 relative">
              <div className="absolute left-6 top-8 bottom-8 w-px bg-gray-200 z-0"></div>

              {normalizedEvents.map((event) => {
                const expanded = isMsgExpanded(event.id);
                const styling = getBadgeStyle(event);

                return (
                  <div key={event.id} className="relative z-10 w-full min-w-0">
                    <div
                      className="flex items-center justify-between mb-3 cursor-pointer group w-full min-w-0"
                      onClick={() => toggleMsg(event.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-12 h-12 ${styling.avatarBg} rounded-full flex items-center justify-center font-bold shadow-sm shrink-0`}
                        >
                          {event.initials}
                        </div>
                        <div className="flex items-center gap-2 flex-nowrap min-w-0 overflow-hidden">
                          <span className="font-bold text-gray-900 whitespace-nowrap truncate">
                            {event.authorName}
                          </span>
                          {event.authorRole && (
                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap truncate">
                              {event.authorRole}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shrink-0 ${styling.badgeClass}`}
                          >
                            {styling.icon}
                            <span>{event.typeLabel}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium shrink-0 ml-4">
                        <span className="whitespace-nowrap">{event.formattedDate}</span>
                        <button
                          type="button"
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          aria-label={expanded ? 'Collapse message' : 'Expand message'}
                        >
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div
                      className={`transition-all duration-300 overflow-hidden ${
                        expanded ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0'
                      }`}
                    >
                      <div className={`ml-[60px] p-4 rounded-xl rounded-tl-none ${styling.cardBg}`}>
                        {event.body ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{event.body}</p>
                        ) : (
                          <p className="text-sm italic opacity-70">No message text recorded for this event.</p>
                        )}

                        {/* Inline attachments if present for this timeline event */}
                        {event.attachments && event.attachments.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex flex-wrap gap-2">
                            {event.attachments.map((att) => (
                              <button
                                key={att.name || att.id || att.file_name}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (att.file_url) {
                                    window.open(att.file_url, '_blank', 'noopener,noreferrer');
                                  } else if (att.name || att.file_name) {
                                    setSelectedDoc(att.name || att.file_name || '');
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium transition-colors shadow-2xs group"
                              >
                                <Paperclip className="h-3 w-3 text-gray-400 group-hover:text-indigo-600" />
                                <span className="truncate max-w-[200px]">{att.file_name || att.name}</span>
                                {att.file_size ? (
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    ({(att.file_size / 1024).toFixed(0)} KB)
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Status transition pill if applicable */}
                        {(event.fromStatus || event.toStatus) && (
                          <div className="mt-3 pt-2 border-t border-gray-200/50 flex items-center gap-2 text-xs font-medium text-gray-600 flex-wrap">
                            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-xs">
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                            </div>
                            {event.fromStatus && (
                              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700">
                                {event.fromStatus}
                              </span>
                            )}
                            {event.fromStatus && event.toStatus && <span className="text-gray-400">→</span>}
                            {event.toStatus && (
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold rounded">
                                {event.toStatus}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedDoc && (
        <DocumentViewerPopup documentName={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </>
  );
}
