"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRealtimeEvent } from "@/lib/realtime";
import {
  fetchNotifications,
  deleteAllNotifications,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "./notificationsApi";

/** The backend sends Frappe message bodies, which may carry HTML; show them as plain text. */
function plainText(message: string | null): string {
  return (message ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Header bell and inbox. Reads the caller's own notifications from
 * `GET /api/v1/notifications`. The realtime `notification` event carries no
 * payload, so it is only a signal to refetch — as is the local `resync`
 * (reconnect / tab focus), because missed events are never replayed.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await fetchNotifications({ page_size: 20 }, { signal });
      if (signal?.aborted) return;
      setItems(data.notifications);
      setUnread(data.unread_count);
      setHasError(false);
    } catch {
      if (!signal?.aborted) setHasError(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useRealtimeEvent("notification", () => void load());
  useRealtimeEvent("resync", () => void load());

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = async (item: NotificationItem) => {
    if (item.read) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    setUnread((count) => Math.max(0, count - 1));
    try {
      await markNotificationRead(item.id);
    } catch {
      void load();
    }
  };

  const grievanceHref = (item: NotificationItem) =>
    item.document_type === "Grievance" && item.document_name
      ? `/all-grievances?ticket=${encodeURIComponent(item.document_name)}`
      : null;

  // One action for the whole row: read it, and go to its case when it has one.
  const handleOpen = (item: NotificationItem) => {
    void handleItemClick(item);
    const href = grievanceHref(item);
    if (!href) return;
    setIsOpen(false);
    router.push(href);
  };

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      void load();
    }
  };

  const handleDelete = async (item: NotificationItem) => {
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    if (!item.read) setUnread((count) => Math.max(0, count - 1));
    try {
      await deleteNotification(item.id);
    } catch {
      void load();
    }
  };

  const handleClearAll = async () => {
    setItems([]);
    setUnread(0);
    try {
      await deleteAllNotifications();
    } catch {
      void load();
    }
  };

  return (
    <div ref={containerRef} className="relative ml-2">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={unread > 0 ? t("unreadLabel", { count: unread }) : t("label")}
        aria-expanded={isOpen}
        className="relative text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40 rounded transition-colors"
      >
        <Bell className="w-[22px] h-[22px] fill-slate-500" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 border-2 border-white text-[10px] font-bold leading-[14px] text-white text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label={t("label")}
          className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">{t("title")}</h2>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-xs font-semibold text-[#16A34A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40 rounded"
                >
                  {t("markAllRead")}
                </button>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-gray-500 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40 rounded"
                >
                  {t("clearAll")}
                </button>
              )}
            </div>
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {hasError ? (
              <li className="px-4 py-6 text-sm text-gray-500 text-center">{t("loadError")}</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-gray-500 text-center">{t("empty")}</li>
            ) : (
              items.map((item) => (
                <li key={item.id} className={`relative ${item.read ? "" : "bg-emerald-50/50"}`}>
                  <button
                    type="button"
                    onClick={() => handleOpen(item)}
                    className="w-full text-left pl-4 pr-10 py-3 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
                  >
                    <span className="flex items-start gap-2">
                      {!item.read && <span aria-hidden="true" className="mt-1.5 w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />}
                      <span className="min-w-0">
                        <span className={`block text-sm text-gray-900 ${item.read ? "font-medium" : "font-bold"}`}>{item.subject}</span>
                        {plainText(item.message) && (
                          <span className="block text-xs text-gray-600 mt-0.5 line-clamp-3">{plainText(item.message)}</span>
                        )}
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {format.relativeTime(new Date(item.created_at))}
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    aria-label={t("delete", { subject: item.subject })}
                    className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                  {grievanceHref(item) && (
                    <Link
                      href={grievanceHref(item) ?? "#"}
                      onClick={() => {
                        void handleItemClick(item);
                        setIsOpen(false);
                      }}
                      className="block px-4 pb-3 pl-8 text-xs font-semibold text-[#16A34A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800/40 rounded"
                    >
                      {t("viewGrievance")}
                    </Link>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
