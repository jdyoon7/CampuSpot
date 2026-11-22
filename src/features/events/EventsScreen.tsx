import { useEffect, useState } from 'react';
import { eventService, getEventListState } from './services/eventService';
import type { CampusEvent, EventFilters } from './types';

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
  if (event.category === 'festival') return '축제';
  if (event.category === 'club') return '동아리';
  if (event.category === 'mt') return 'MT';
  return '행사';
}

export function EventsScreen() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [filters, setFilters] = useState<EventFilters>({});
  const [campusQuery, setCampusQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampusEvent | null>(null);
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
    void eventService
      .getEvent(selectedId)
      .then((result) => {
        if (!active) return;
        setDetail(result.event);
        if (result.status === 'unavailable') setUnavailable(true);
      })
      .catch(() => {
        if (active)
          setError('행사 정보를 불러오지 못했습니다. 다시 시도해 주세요.');
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  function applyFilters() {
    setSelectedId(null);
    setFilters({
      campusQuery: campusQuery.trim() || undefined,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
    });
  }

  const listState = getEventListState({ loading, error, unavailable, events });

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
            ? 'Supabase 행사 테이블과 공통 인증·학교 기반이 준비되면 실제 정보를 표시합니다.'
            : '표시되는 행사 정보는 검수 후 공개됩니다.'}
        </span>
      </div>

      <div className="events-filters" aria-label="행사 검색 조건">
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
            aria-label="시작일 YYYY-MM-DD"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label>
          종료일
          <input
            aria-label="종료일 YYYY-MM-DD"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <button type="button" onClick={applyFilters}>
          행사 검색
        </button>
      </div>

      {selectedId && detail ? (
        <article className="event-detail">
          <button
            type="button"
            className="events-back"
            onClick={() => setSelectedId(null)}
          >
            ← 목록
          </button>
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
        </article>
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
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
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
