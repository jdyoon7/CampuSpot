import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../shared/auth/useAuth';
import { ReportForm } from './components/ReportForm';
import { MyReports } from './components/MyReports';
import { canReview } from './api/review';
import { PublishedOffers } from './components/PublishedOffers';
import './discounts.css';

export default function DiscountsPage() {
  const { state, refresh } = useAuth(),
    [revision, setRevision] = useState(0);
  const userId = state.status === 'ready' ? state.user.id : undefined;
  return (
    <article className="discounts-page">
      <header>
        <h1>할인·혜택</h1>
        <p>발견한 학생 혜택을 공식 공지와 함께 제보해 주세요.</p>
        <Link className="discount-calendar-link" to="/discounts/calendar">
          <CalendarDays size={18} aria-hidden="true" /> 혜택 캘린더
        </Link>
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
      {state.status !== 'unconfigured' && <PublishedOffers />}
      <ReportForm
        key={userId ?? 'guest'}
        userId={userId}
        onSaved={() => setRevision((v) => v + 1)}
      />
      {userId && <MyReports key={userId + '-' + revision} userId={userId} />}
    </article>
  );
}
