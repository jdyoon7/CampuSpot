import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/useAuth';
import { listMyOfferBookmarks } from './api/bookmarks';
import { BookmarkButton } from './components/BookmarkButton';
import { OfferDetails } from './components/OfferDetails';
import { ReportList } from './components/ReportList';
import './discounts.css';

export function BookmarksPage() {
  const { state, refresh } = useAuth();
  const [revision, setRevision] = useState(0);
  return (
    <article className="discounts-page">
      <header>
        <Link to="/discounts">← 할인·혜택</Link>
        <h1>저장한 혜택</h1>
      </header>
      {state.status === 'ready' && (
        <ReportList
          key={state.user.id + '-' + revision}
          title="내 저장 목록"
          empty="저장한 혜택이 없습니다."
          load={listMyOfferBookmarks}
        >
          {(offer) => (
            <>
              <strong>{offer.store_name}</strong>
              {offer.available && offer.details && offer.source_url ? (
                <OfferDetails
                  offer={{
                    details: offer.details,
                    source_url: offer.source_url,
                    starts_on: offer.starts_on,
                    ends_on: offer.ends_on,
                  }}
                />
              ) : (
                <p>이 혜택은 종료되었거나 공개가 중단되었습니다.</p>
              )}
              <BookmarkButton
                offerId={offer.id}
                initialSaved
                onRemove={() => setRevision((n) => n + 1)}
              />
            </>
          )}
        </ReportList>
      )}
      {state.status === 'signed-out' && (
        <p>
          <Link to="/me">로그인</Link>하면 저장한 혜택을 볼 수 있습니다.
        </p>
      )}
      {state.status === 'loading' && (
        <p role="status">로그인 상태를 확인하는 중입니다.</p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          {state.error.message}{' '}
          <button type="button" onClick={refresh}>
            다시 확인
          </button>
        </div>
      )}
      {state.status === 'unconfigured' && (
        <p role="status">혜택 서비스 연결 후 저장 목록을 볼 수 있습니다.</p>
      )}
    </article>
  );
}
