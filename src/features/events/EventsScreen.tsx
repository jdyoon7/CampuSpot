import { useEffect, useState, type FormEvent } from 'react';
import {
  eventService,
  getEventDetailState,
  getEventListState,
  validateEventDateRange,
} from './services/eventService';
import type { CampusEvent, EventCategory, EventFilters } from './types';

const categories: { value: EventCategory | ''; label: string }[] = [
  { value: '', label: '전체 유형' },
  { value: 'festival', label: '축제' },
  { value: 'club', label: '동아리' },
  { value: 'mt', label: 'MT' },
  { value: 'other', label: '기타 행사' },
];

function formatEventTime(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function categoryLabel(event: CampusEvent): string {
  return (
    categories.find(({ value }) => value === event.category)?.label ?? '행사'
  );
}

export function EventsScreen() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [filters, setFilters] = useState<EventFilters>({});
  const [campusQuery, setCampusQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampusEvent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailUnavailable, setDetailUnavailable] = useState(false);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void eventService
      .listEvents(filters)
      .then((result) => {
        if (!active) return;
        setEvents(result.events);
        setUnavailable(result.status === 'unavailable');
      })
      .catch(() => {
        if (active)
          setError(
            '행사 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, attempt]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    setDetailUnavailable(false);
    void eventService
      .getEvent(selectedId)
      .then((result) => {
        if (!active) return;
        setDetail(result.event);
        setDetailUnavailable(result.status === 'unavailable');
      })
      .catch(() => {
        if (active)
          setDetailError(
            '행사 정보를 불러오지 못했습니다. 다시 시도해 주세요.',
          );
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, detailAttempt]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateEventDateRange(
      startDate || undefined,
      endDate || undefined,
    );
    if (validationError) {
      setFilterError(validationError);
      return;
    }
    setFilterError(null);
    setSelectedId(null);
    setFilters({
      campusQuery: campusQuery.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: category || undefined,
    });
  }

  function clearFilters() {
    setCampusQuery('');
    setStartDate('');
    setEndDate('');
    setCategory('');
    setFilterError(null);
    setSelectedId(null);
    setFilters({});
  }

  const listState = getEventListState({ loading, error, unavailable, events });
  const detailState = getEventDetailState({
    loading: detailLoading,
    error: detailError,
    unavailable: detailUnavailable,
    event: detail,
  });

  return (
    <section className="events-page" aria-labelledby="events-title">
      <header className="events-header">
        <p className="events-eyebrow">CAMPUSPOT · EVENTS</p>
        <h1 id="events-title">행사·장소</h1>
        <p>학교 행사와 동아리 소식을 확인할 수 있습니다.</p>
      </header>

      <div className="events-connection" role="status">
        <strong>행사 데이터 미연동</strong>
        <span>
          {unavailable
            ? 'Supabase 행사 테이블이 준비되면 검수된 실제 정보를 표시합니다.'
            : '행사 정보는 출처와 검수 상태를 확인한 뒤 공개합니다.'}
        </span>
      </div>

      <form
        className="events-filters"
        aria-label="행사 검색 조건"
        onSubmit={applyFilters}
      >
        <label>
          학교 이름
          <input
            value={campusQuery}
            onChange={(event) => setCampusQuery(event.target.value)}
            placeholder="학교명 (선택)"
          />
        </label>
        <label>
          시작일
          <input
            aria-label="시작일"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          종료일
          <input
            aria-label="종료일"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <label>
          행사 유형
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as EventCategory | '')
            }
          >
            {categories.map((item) => (
              <option key={item.value || 'all'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="events-filter-actions">
          <button type="submit">행사 검색</button>
          <button type="button" className="events-reset" onClick={clearFilters}>
            조건 초기화
          </button>
        </div>
        {filterError && (
          <p className="events-filter-error" role="alert">
            {filterError}
          </p>
        )}
      </form>

      {selectedId ? (
        <section
          className="event-detail"
          aria-label="행사 상세"
          aria-live="polite"
        >
          <button
            type="button"
            className="events-back"
            onClick={() => setSelectedId(null)}
          >
            ← 목록
          </button>
          {detailState === 'loading' && (
            <p role="status">행사 상세를 불러오는 중입니다…</p>
          )}
          {detailState === 'error' && (
            <div className="events-state events-error" role="alert">
              <p>{detailError}</p>
              <button
                type="button"
                onClick={() => setDetailAttempt((value) => value + 1)}
              >
                다시 시도
              </button>
            </div>
          )}
          {detailState === 'unavailable' && (
            <p className="events-state" role="status">
              행사 상세 데이터가 아직 연결되지 않았습니다.
            </p>
          )}
          {detailState === 'not_found' && (
            <p className="events-state" role="status">
              요청한 행사를 찾을 수 없습니다.
            </p>
          )}
          {detailState === 'ready' && detail && (
            <>
              <div className="event-card-meta">
                <span>{categoryLabel(detail)}</span>
                <span>{detail.campusName}</span>
              </div>
              <h2>{detail.title}</h2>
              <p>
                {formatEventTime(detail.startsAt)} –{' '}
                {formatEventTime(detail.endsAt)}
              </p>
              <p>
                {detail.location.name}
                {detail.location.address ? ` · ${detail.location.address}` : ''}
              </p>
              <p>{detail.description}</p>
              {detail.applicationMethod && (
                <p>
                  <strong>신청 방법</strong>
                  <br />
                  {detail.applicationMethod}
                </p>
              )}
              {detail.participationConditions.length > 0 && (
                <p>
                  <strong>참가 조건</strong>
                  <br />
                  {detail.participationConditions.join(' · ')}
                </p>
              )}
              {detail.contact && (
                <p>
                  <strong>문의</strong>
                  <br />
                  {detail.contact}
                </p>
              )}
              <button type="button" disabled aria-disabled="true">
                관심 행사 저장 · 미연동
              </button>
            </>
          )}
        </section>
      ) : (
        <section
          className="events-results"
          aria-label="행사 목록"
          aria-live="polite"
        >
          <div className="events-results-heading">
            <h2>행사 목록</h2>
            {listState === 'ready' && <span>{events.length}개</span>}
          </div>
          {listState === 'loading' && (
            <p role="status">행사를 불러오는 중입니다…</p>
          )}
          {listState === 'error' && (
            <div className="events-state events-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setAttempt((v) => v + 1)}>
                다시 시도
              </button>
            </div>
          )}
          {listState === 'unavailable' && (
            <p className="events-state" role="status">
              행사 데이터베이스가 아직 연결되지 않았습니다. 연결 전에는 행사
              목록을 표시하지 않습니다.
            </p>
          )}
          {listState === 'empty' && (
            <p className="events-state">조건에 맞는 공개 행사가 없습니다.</p>
          )}
          {listState === 'ready' &&
            events.map((event) => (
              <button
                type="button"
                className="event-card"
                key={event.id}
                onClick={() => setSelectedId(event.id)}
              >
                <span className="event-card-meta">
                  <span>{categoryLabel(event)}</span>
                  <span>{event.campusName}</span>
                </span>
                <strong>{event.title}</strong>
                <span>
                  {formatEventTime(event.startsAt)} –{' '}
                  {formatEventTime(event.endsAt)}
                </span>
                <span>{event.location.name}</span>
              </button>
            ))}
        </section>
      )}
    </section>
  );
}
