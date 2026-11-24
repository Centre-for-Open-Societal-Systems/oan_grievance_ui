import { fetchApi } from '@/lib/api';

export interface NotificationItem {
  id: string;
  subject: string;
  message: string | null;
  type: string | null;
  document_type: string | null;
  document_name: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationListData {
  unread_count: number;
  notifications: NotificationItem[];
}

/** GET /api/v1/notifications — the caller's own inbox, newest first. `unread_count` ignores `status`. */
export function fetchNotifications(
  params: { status?: 'unread' | 'read' | 'all'; page?: number; page_size?: number } = {},
  options: { signal?: AbortSignal } = {}
): Promise<NotificationListData> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const qs = query.toString();
  return fetchApi<NotificationListData>(`/api/v1/notifications${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    signal: options.signal,
  });
}

/** PATCH /api/v1/notifications/:id — marks one notification read or unread. */
export function markNotificationRead(id: string, read = true): Promise<NotificationItem> {
  return fetchApi<NotificationItem>(`/api/v1/notifications/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ read }),
  });
}

/** PATCH /api/v1/notifications with `all: true` — marks the whole inbox read. */
export function markAllNotificationsRead(): Promise<unknown> {
  return fetchApi<unknown>('/api/v1/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ all: true, read: true }),
  });
}

/** DELETE /api/v1/notifications/:id — deletes one of the caller's notifications. */
export function deleteNotification(id: string): Promise<unknown> {
  return fetchApi<unknown>(`/api/v1/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** DELETE /api/v1/notifications with `all: true` — clears the whole inbox. */
export function deleteAllNotifications(): Promise<unknown> {
  return fetchApi<unknown>('/api/v1/notifications', {
    method: 'DELETE',
    body: JSON.stringify({ all: true }),
  });
}
