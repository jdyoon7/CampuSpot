import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  CalendarDays,
  MapPin,
  Store,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../../shared/auth/useAuth';
import { ReportForm } from './components/ReportForm';
import { MyReports } from './components/MyReports';
import { MyCorrections } from './components/MyCorrections';
import { canReview } from './api/review';
import { PublishedOffers } from './components/PublishedOffers';
import './discounts.css';

export default function DiscountsPage() {
  const { state, refresh } = useAuth(),
    [revision, setRevision] = useState(0);
  const [correctionRevision, setCorrectionRevision] = useState(0);
  const userId = state.status === 'ready' ? state.user.id : undefined;
  return (
    <article className="discounts-page">
      <header>
        <h1>할인·혜택</h1>
        <p>발견한 학생 혜택을 공식 공지와 함께 제보해 주세요.</p>
        <div className="discount-utility-links">
          <Link className="discount-calendar-link" to="/discounts/calendar">
            <CalendarDays size={18} aria-hidden="true" /> 혜택 캘린더
          </Link>
          <Link className="discount-calendar-link" to="/discounts/saved">
            <Bookmark size={18} aria-hidden="true" /> 저장한 혜택
          </Link>
          <Link className="discount-calendar-link" to="/discounts/coupons">
            <Ticket size={18} aria-hidden="true" /> 내 쿠폰·포인트
          </Link>
          <Link className="discount-calendar-link" to="/discounts/map">
            <MapPin size={18} aria-hidden="true" /> 혜택 지도
          </Link>
          <Link className="discount-calendar-link" to="/discounts/business">
            <Store size={18} aria-hidden="true" /> 매장·지점
          </Link>
          <Link
            className="discount-calendar-link"
            to="/discounts/notifications"
          >
            <Bell size={18} aria-hidden="true" /> 혜택 알림
          </Link>
        </div>
      </header>
      {state.status === 'signed-out' && (
        <p className="discount-notice">
          제보하려면 로그인이 필요합니다. <Link to="/me">로그인하기</Link>
        </p>
      )}
      {state.status === 'unconfigured' && (
        <p className="discount-notice" role="status">
          계정 서비스 연결 후 제보를 등록할 수 있습니다.
        </p>
      )}
      {state.status === 'loading' && (
        <p role="status">로그인 상태를 확인하는 중입니다.</p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          {state.error.message} <button onClick={refresh}>다시 불러오기</button>
        </div>
      )}
      {state.status === 'ready' && canReview(state.account.roles) && (
        <Link className="discount-review-link" to="/discounts/review">
          제보 검수하기
        </Link>
      )}
      {state.status !== 'unconfigured' && (
        <PublishedOffers
          userId={userId}
          canEdit={state.status === 'ready' && canReview(state.account.roles)}
          onCorrectionSaved={() => setCorrectionRevision((n) => n + 1)}
        />
      )}
      <ReportForm
        key={userId ?? 'guest'}
        userId={userId}
        onSaved={() => setRevision((v) => v + 1)}
      />
      {userId && (
        <MyReports key={`reports-${userId}-${revision}`} userId={userId} />
      )}
      {userId && (
        <MyCorrections
          key={`corrections-${userId}-${correctionRevision}`}
          userId={userId}
        />
      )}
    </article>
  );
}
