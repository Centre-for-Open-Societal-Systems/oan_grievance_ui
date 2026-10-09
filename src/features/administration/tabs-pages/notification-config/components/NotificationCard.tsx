"use client";

import { NotificationRow } from './NotificationRow';
import { NotificationTemplate, PlaceholderItem, UpdateNotificationTemplatePayload } from './types';

interface NotificationCardProps {
    notifications: NotificationTemplate[];
    onUpdate?: (templateName: string, payload: UpdateNotificationTemplatePayload) => Promise<void>;
    placeholders?: PlaceholderItem[];
}

export function NotificationCard({ notifications, onUpdate, placeholders }: NotificationCardProps) {
    if (notifications.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 font-medium">
                No notification templates found matching your filters.
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {notifications.map((notification, index) => (
                <NotificationRow 
                    key={notification.name} 
                    notification={notification} 
                    isLast={index === notifications.length - 1} 
                    onUpdate={onUpdate}
                    placeholders={placeholders}
                />
            ))}
        </div>
    );
}
