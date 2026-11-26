import { useCallback, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../shared/lib/supabase';
import { useAuth } from '../../shared/auth/useAuth';
import { withBusinessLinks } from '../business/api';
import { withBookmarkStatus } from './api/bookmarks';
import { listCalendarOffers } from './api/calendar';
import { BookmarkButton } from './components/BookmarkButton';
import { CorrectionForm } from './components/CorrectionForm';
import { OfferDetails } from './components/OfferDetails';
import { ReportList } from './components/ReportList';
import './discounts.css';

const seoulDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const koreanDay = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'UTC',
  dateStyle: 'full',
});
const week = ['일', '월', '화', '수', '목', '금', '토'];
const dayAt = (key: string) => new Date(key + 'T00:00:00Z');

export function CalendarPage() {
  const { state } = useAuth();
  const userId = state.status === 'ready' ? state.user.id : undefined;
  const today = seoulDate.format(new Date());
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const todayMonth = today.slice(0, 7);
  const visibleMonth = month < todayMonth ? todayMonth : month;
  const activeDay = selected < today ? today : selected;
  const first = dayAt(visibleMonth + '-01');
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const offset = first.getUTCDay();
  const size = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const load = useCallback(
    async (page: number) =>
      withBusinessLinks(
        await withBookmarkStatus(
          await listCalendarOffers(activeDay, page),
          userId,
        ),
      ),
    [activeDay, userId],
  );

  function moveMonth(step: number) {
    const nextMonth = new Date(Date.UTC(year, monthIndex + step, 1))
      .toISOString()
      .slice(0, 7);
    const firstDay = nextMonth + '-01';
    setMonth(nextMonth);
    setSelected(firstDay < today ? today : firstDay);
  }

  return (
    <article className="discounts-page discount-calendar">
      <header>
        <Link to="/discounts">← 할인·혜택</Link>
        <h1>
          <CalendarDays size={26} aria-hidden="true" /> 혜택 캘린더
        </h1>
        <p>날짜를 선택하면 그날 이용할 수 있는 혜택을 볼 수 있어요.</p>
      </header>
      {!supabase ? (
        <p className="discount-notice" role="status">
          혜택 서비스 연결 후 일정을 볼 수 있습니다.
        </p>
      ) : (
        <>
          <section
            className="discount-calendar-panel"
            aria-label="혜택 날짜 선택"
          >
            <div className="discount-calendar-toolbar">
              <button
                type="button"
                aria-label="이전 달"
                disabled={visibleMonth <= todayMonth}
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <h2 aria-live="polite">
                {year}년 {monthIndex + 1}월
              </h2>
              <button
                type="button"
                aria-label="다음 달"
                disabled={year === 9999 && monthIndex === 11}
                onClick={() => moveMonth(1)}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
            <table aria-label="월간 달력">
              <thead>
                <tr>
                  {week.map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  { length: Math.ceil((offset + size) / 7) },
                  (_, row) => (
                    <tr key={row}>
                      {week.map((weekday, column) => {
                        const day = row * 7 + column - offset + 1;
                        if (day < 1 || day > size) return <td key={weekday} />;
                        const key =
                          visibleMonth + '-' + String(day).padStart(2, '0');
                        return (
                          <td key={weekday}>
                            <button
                              type="button"
                              disabled={key < today}
                              aria-label={koreanDay.format(dayAt(key))}
                              aria-current={key === today ? 'date' : undefined}
                              aria-pressed={key === activeDay}
                              onClick={() => setSelected(key)}
                            >
                              {day}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
            <button
              type="button"
              className="discount-calendar-today"
              onClick={() => {
                setMonth(todayMonth);
                setSelected(today);
              }}
            >
              오늘로 이동
            </button>
          </section>
          <ReportList
            key={(userId ?? 'guest') + '-' + activeDay}
            title={koreanDay.format(dayAt(activeDay)) + ' 혜택'}
            empty="이 날짜에 이용할 수 있는 공개 혜택이 없습니다."
            load={load}
          >
            {(offer) => (
              <>
                <strong>{offer.store_name}</strong>
                <OfferDetails offer={offer} />
                {offer.business && (
                  <Link
                    to={'/discounts/business/' + offer.business.business_id}
                  >
                    매장 정보 · {offer.business.branch_name}
                  </Link>
                )}
                {userId && (
                  <BookmarkButton
                    offerId={offer.id}
                    initialSaved={offer.saved}
                  />
                )}
                <CorrectionForm offerId={offer.id} />
              </>
            )}
          </ReportList>
        </>
      )}
    </article>
  );
}
