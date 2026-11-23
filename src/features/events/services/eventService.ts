import { supabase } from '../../../shared/lib/supabase';
import type {
  CampusEvent,
  EventDetailResult,
  EventDetailState,
  EventFilters,
  EventListResult,
  EventListState,
  EventService,
} from '../types';

export function validateEventDateRange(
  startDate?: string,
  endDate?: string,
): string | null {
  if (startDate && !isCalendarDate(startDate))
    return '시작일은 올바른 YYYY-MM-DD 날짜여야 합니다.';
  if (endDate && !isCalendarDate(endDate))
    return '종료일은 올바른 YYYY-MM-DD 날짜여야 합니다.';
  if (startDate && endDate && startDate > endDate)
    return '종료일은 시작일과 같거나 이후여야 합니다.';
  return null;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function seoulDayStart(date: string): number {
  return new Date(`${date}T00:00:00+09:00`).getTime();
}

function nextCalendarDate(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Pure filter used by unit tests; fixtures are intentionally never imported by the service. */
export function filterEvents(
  events: CampusEvent[],
  filters: EventFilters = {},
): CampusEvent[] {
  const { campusQuery, startDate, endDate, category } = filters;
  const validationError = validateEventDateRange(startDate, endDate);
  if (validationError) throw new Error(validationError);

  const query = campusQuery?.trim().toLocaleLowerCase('ko-KR');
  const rangeStartDate = startDate ?? endDate;
  const rangeEndDate = endDate ?? startDate;
  const rangeStart = rangeStartDate ? seoulDayStart(rangeStartDate) : undefined;
  const rangeEnd = rangeEndDate
    ? seoulDayStart(nextCalendarDate(rangeEndDate))
    : undefined;

  return events
    .filter((event) => event.verificationStatus === 'verified')
    .filter(
      (event) =>
        !query || event.campusName.toLocaleLowerCase('ko-KR').includes(query),
    )
    .filter((event) => !category || event.category === category)
    .filter((event) => {
      const eventStart = new Date(event.startsAt).getTime();
      const eventEnd = new Date(event.endsAt).getTime();
      return (
        (rangeStart === undefined || eventEnd > rangeStart) &&
        (rangeEnd === undefined || eventStart < rangeEnd)
      );
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function getEventListState(input: {
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  events: CampusEvent[];
}): EventListState {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (input.unavailable) return 'unavailable';
  return input.events.length === 0 ? 'empty' : 'ready';
}

export function getEventDetailState(input: {
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  event: CampusEvent | null;
}): EventDetailState {
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (input.unavailable) return 'unavailable';
  return input.event ? 'ready' : 'not_found';
}

function unavailableReason():
  'supabase_not_configured' | 'events_schema_not_ready' {
  return supabase ? 'events_schema_not_ready' : 'supabase_not_configured';
}

export const eventService: EventService = {
  async listEvents(filters = {}): Promise<EventListResult> {
    const validationError = validateEventDateRange(
      filters.startDate,
      filters.endDate,
    );
    if (validationError) throw new Error(validationError);

    // Event migrations are not present yet.
    // Never fall back to fixture/demo records in a service used by the UI.
    return { status: 'unavailable', reason: unavailableReason(), events: [] };
  },

  async getEvent(): Promise<EventDetailResult> {
    return { status: 'unavailable', reason: unavailableReason(), event: null };
  },
};
