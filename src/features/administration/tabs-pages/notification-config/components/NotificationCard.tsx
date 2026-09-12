"use client";

import React from 'react';
import { NotificationRow } from './NotificationRow';
import { NotificationConfig } from './types';

interface NotificationCardProps {
    notifications: NotificationConfig[];
}

export function NotificationCard({ notifications }: NotificationCardProps) {
    return (
        <div className="flex flex-col">
            {notifications.map((notification, index) => (
                <NotificationRow 
                    key={notification.id} 
                    notification={notification} 
                    isLast={index === notifications.length - 1} 
                />
            ))}
        </div>
    );
}
