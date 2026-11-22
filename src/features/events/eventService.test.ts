import { describe, expect, test } from 'vitest';
import { campusEvents } from '../../../tests/fixtures/events/events';
import {
  eventService,
  filterEvents,
  getEventListState,
  validateEventDateRange,
} from './services/eventService';

const verifiedFixtures = campusEvents.map((event) => ({
  ...event,
  verificationStatus: 'verified' as const,
}));

describe('event date validation', () => {
  test('accepts valid date ranges and single-day filters', () => {
    expect(validateEventDateRange('2026-02-28', '2026-03-01')).toBeNull();
    expect(validateEventDateRange('2024-02-29', '2024-02-29')).toBeNull();
  });

  test('rejects impossible dates, malformed dates, and reversed ranges', () => {
    expect(validateEventDateRange('2026-02-29')).toContain('올바른');
    expect(validateEventDateRange('2026/02/20')).toContain('YYYY-MM-DD');
    expect(validateEventDateRange('2026-03-02', '2026-03-01')).toContain(
      '종료일',
    );
  });
});

describe('event filtering', () => {
  test('filters by school and dates in Korea time and keeps overlapping events', () => {
    const events = filterEvents(verifiedFixtures, {
      campusQuery: '한빛',
      startDate: '2026-11-21',
      endDate: '2026-11-21',
    });

    expect(events.map((event) => event.id)).toEqual([
      'event-hanbit-night-market',
    ]);
  });

  test('does not include unverified fixture records in public results', () => {
    expect(filterEvents(campusEvents)).toEqual([]);
  });

  test('returns an empty list when no event matches', () => {
    expect(
      filterEvents(verifiedFixtures, { campusQuery: '없는 학교' }),
    ).toEqual([]);
  });
});

describe('event service connection state', () => {
  test('never exposes fixtures when the database contract is unavailable', async () => {
    const result = await eventService.listEvents();
    expect(result.status).toBe('unavailable');
    expect(result.events).toEqual([]);
  });

  test('distinguishes empty results, unavailable data, and errors in the UI state', () => {
    expect(
      getEventListState({
        loading: false,
        error: null,
        unavailable: false,
        events: [],
      }),
    ).toBe('empty');
    expect(
      getEventListState({
        loading: false,
        error: null,
        unavailable: true,
        events: [],
      }),
    ).toBe('unavailable');
    expect(
      getEventListState({
        loading: false,
        error: 'failed',
        unavailable: false,
        events: [],
      }),
    ).toBe('error');
    expect(
      getEventListState({
        loading: true,
        error: null,
        unavailable: false,
        events: [],
      }),
    ).toBe('loading');
  });
});
