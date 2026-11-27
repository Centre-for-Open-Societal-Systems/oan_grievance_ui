import type { GrievanceTimelineData, TimelineEntry } from '../types';
import type { GuestCase, GuestTimelineEntry } from './guestApi';

function toEntry(entry: GuestTimelineEntry): TimelineEntry {
  return {
    id: entry.id ?? undefined,
    name: entry.name ?? undefined,
    entry_type: entry.entry_type,
    // The guest view carries public entries only.
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
    // A guest cannot open files, so the timeline offers none to click; the page lists their names.
    attachments: [],
  };
}

/**
 * The guest's view of the case in the shape the case panel's timeline reads. It carries no
 * submitter name or contact, no officer or department and no actions: the backend sends none,
 * and the submitter is shown as anonymous, as the case is.
 */
export function guestTimelineData(data: GuestCase): GrievanceTimelineData {
  return {
    ticket_number: data.ticket_number,
    status: data.status,
    description: data.description ?? null,
    service_category: data.service_category ?? null,
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
    timeline: data.timeline.map(toEntry),
  };
}
