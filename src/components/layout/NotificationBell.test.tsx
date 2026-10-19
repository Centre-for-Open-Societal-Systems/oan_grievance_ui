// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/en.json';
import { NotificationBell } from './NotificationBell';

const { fetchNotifications, markNotificationRead, markAllNotificationsRead } = vi.hoisted(() => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue({}),
  markAllNotificationsRead: vi.fn().mockResolvedValue({}),
}));

vi.mock('./notificationsApi', () => ({ fetchNotifications, markNotificationRead, markAllNotificationsRead }));
vi.mock('@/lib/realtime', () => ({ useRealtimeEvent: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const INBOX = {
  unread_count: 2,
  notifications: [
    { id: 'N1', subject: 'Grievance assigned', message: null, type: 'Alert', document_type: null, document_name: null, read: false, created_at: '2026-10-15T10:00:00+00:00' },
    { id: 'N2', subject: 'Case resolved', message: null, type: 'Alert', document_type: null, document_name: null, read: true, created_at: '2026-10-14T10:00:00+00:00' },
  ],
};

function renderBell() {
  render(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <NotificationBell />
    </NextIntlClientProvider>
  );
}

describe('NotificationBell', () => {
  it('shows the unread count from the inbox and lists notifications when opened', async () => {
    fetchNotifications.mockResolvedValue(INBOX);
    renderBell();

    const bell = await screen.findByRole('button', { name: 'Notifications, 2 new' });
    fireEvent.click(bell);

    expect(await screen.findByText('Grievance assigned')).toBeInTheDocument();
    expect(screen.getByText('Case resolved')).toBeInTheDocument();
  });

  it('marks a notification read when clicked', async () => {
    fetchNotifications.mockResolvedValue(INBOX);
    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 new' }));
    fireEvent.click(await screen.findByRole('button', { name: /Grievance assigned/ }));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('N1'));
    expect(screen.getByRole('button', { name: 'Notifications, 1 new' })).toBeInTheDocument();
  });

  it('marks everything read', async () => {
    fetchNotifications.mockResolvedValue(INBOX);
    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 new' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    fetchNotifications.mockResolvedValue({ unread_count: 0, notifications: [] });
    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('You have no notifications.')).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the bell', async () => {
    fetchNotifications.mockResolvedValue({ unread_count: 0, notifications: [] });
    renderBell();

    const bell = await screen.findByRole('button', { name: 'Notifications' });
    expect(bell).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(bell);
    await screen.findByText('You have no notifications.');
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('You have no notifications.')).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });
});
