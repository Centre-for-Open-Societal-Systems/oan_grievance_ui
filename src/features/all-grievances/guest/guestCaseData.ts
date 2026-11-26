import type { GrievanceTimelineAttachment, GrievanceTimelineData, TimelineEntry } from '../types';
import type { GuestAttachment, GuestCase, GuestTimelineEntry } from './guestApi';

function toAttachment(att: GuestAttachment): GrievanceTimelineAttachment {
  return {
    name: att.name,
    attachment: att.attachment ?? undefined,
    file_name: att.file_name ?? null,
    file_size: att.file_size ?? att.size_bytes ?? null,
    mime_type: att.mime_type ?? null,
    document_type: att.document_type ?? null,
    timeline_entry: att.timeline_entry ?? null,
    scan_status: att.scan_status ?? null,
    creation: att.creation ?? null,
  };
}

function toEntry(entry: GuestTimelineEntry): TimelineEntry {
  return {
    id: entry.id ?? undefined,
    name: entry.name ?? undefined,
    entry_type: entry.entry_type,
    // The guest routes send public entries only.
    is_internal: false,
    body: entry.body ?? '',
    author_type: entry.author_type ?? undefined,
    created_on: entry.created_on ?? '',
    from_status: entry.from_status ?? null,
    to_status: entry.to_status ?? null,
    action: entry.action ?? null,
    action_taken: entry.action_taken ?? null,
    resolution_summary: entry.resolution_summary ?? null,
    response_number: entry.response_number ?? undefined,
    attachments: (entry.attachments ?? []).map(toAttachment),
  };
}

/**
 * The guest's view of the case in the shape the case panel's components read. It carries no
 * submitter name or contact, no officer or department and no actions: the backend sends none,
 * and the submitter is shown as anonymous, as the case is.
 */
export function guestTimelineData(data: GuestCase): GrievanceTimelineData {
  return {
    ticket_number: data.ticket_number,
    status: data.status,
    description: data.description ?? null,
    service_category: data.service_category ?? null,
    grievance_type: data.grievance_type ?? null,
    location: data.location ?? null,
    summary: {
      description: data.description ?? null,
      desired_outcome: data.desired_outcome ?? null,
      service_category: data.service_category ?? null,
      grievance_type_name: data.grievance_type_name ?? null,
      location: data.location ?? null,
    },
    submitter: { is_anonymous: true },
    sla: {
      sla_due_date: data.sla?.sla_due_date ?? null,
      confirmation_deadline: data.sla?.confirmation_deadline ?? null,
    },
    available_actions: [],
    attachments: data.attachments.map(toAttachment),
    timeline: data.timeline.map(toEntry),
    has_more: data.has_more ?? false,
    next_cursor: data.next_cursor ?? null,
  };
}
