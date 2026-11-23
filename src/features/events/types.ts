export type ID = string;
export type ISODateTime = string;

export type EventCategory = 'festival' | 'club' | 'mt' | 'other';

export interface EventLocation {
  name: string;
  address?: string;
}

export interface CampusEvent {
  id: ID;
  title: string;
  campusId: ID;
  campusName: string;
  region?: string;
  organizerId?: ID;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  location: EventLocation;
  category: EventCategory;
  description: string;
  posterLabel?: string;
  applicationMethod?: string;
  participationConditions: string[];
  contact?: string;
  officialUrl?: string;
  sourceUrl?: string;
  updatedAt?: ISODateTime;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export interface EventFilters {
  campusQuery?: string;
  startDate?: string;
  endDate?: string;
  category?: EventCategory;
}

export type EventListResult =
  | { status: 'ready'; events: CampusEvent[] }
  | {
      status: 'unavailable';
      reason: 'supabase_not_configured' | 'events_schema_not_ready';
      events: [];
    };

export type EventDetailResult =
  | { status: 'ready'; event: CampusEvent | null }
  | {
      status: 'unavailable';
      reason: 'supabase_not_configured' | 'events_schema_not_ready';
      event: null;
    };

export type EventListState =
  'loading' | 'error' | 'unavailable' | 'empty' | 'ready';

export type EventDetailState =
  'loading' | 'error' | 'unavailable' | 'not_found' | 'ready';

export interface EventService {
  listEvents(filters?: EventFilters): Promise<EventListResult>;
  getEvent(id: ID): Promise<EventDetailResult>;
}
