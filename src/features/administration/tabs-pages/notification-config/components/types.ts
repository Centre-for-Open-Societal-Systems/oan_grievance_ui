export interface PlaceholderItem {
    key?: string;
    field?: string;
    name?: string;
    label: string;
    description?: string;
    example?: string;
}

export interface PlaceholdersResponseData {
    placeholders: PlaceholderItem[];
    total_count: number;
}

export interface NotificationTemplate {
    name: string;
    event: string;
    channel: string; // 'SMS' | 'Email'
    recipient_type: string;
    role_level?: string | null;
    role_level_name?: string | null;
    subject: string;
    body: string;
    enabled: boolean;
    condition?: string | null;
    placeholders?: string[];
    raw_subject?: string | null;
    raw_body?: string | null;
    translations?: Record<string, unknown>;
}

export interface NotificationTemplateListData {
    templates: NotificationTemplate[];
    pagination?: {
        page: number;
        page_size: number;
        total_count: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

export interface NotificationTemplateData {
    template: NotificationTemplate;
}

export interface NotificationTemplateListParams {
    event?: string;
    channel?: string;
    recipient_type?: string;
    role_level?: string;
    enabled?: boolean | string;
    page?: number;
    page_size?: number;
}

export interface UpdateNotificationTemplatePayload {
    subject?: string;
    body?: string;
    enabled?: boolean;
    recipient_type?: string;
    role_level?: string | null;
    recipient_id?: string | null;
    translations?: Record<string, unknown>;
}

export interface FlatRecipientOption {
    id: string;
    label: string;
    recipient_type: string;
    role_level?: string | null;
    role_level_name?: string | null;
}

export interface RoleLevelOption {
    level_code: string;
    level_name: string;
    level_order: number;
    escalation_hours?: number | null;
    description?: string | null;
}

export interface NotificationTemplateOptionsData {
    channels: string[];
    recipients: FlatRecipientOption[];
    placeholders: PlaceholderItem[];
    role_levels: RoleLevelOption[];
}


export interface NotificationConfig {
    id: string;
    title?: string;
    eventType?: string;
    active: boolean;
    channel: ('SMS' | 'Email')[];
    subject: string;
    trigger: string;
    recipients: string[];
    template?: string;
    lastEdited?: string;
}
