import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { client, errorFor } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { supabase } from '../../shared/lib/supabase';
import { ActionForm } from '../auth/ActionForm';
import { withBookmarkStatus } from '../discounts/api/bookmarks';
import { canReview } from '../discounts/api/review';
import { searchPublished } from '../discounts/api/search';
import { BookmarkButton } from '../discounts/components/BookmarkButton';
import { OfferDetails } from '../discounts/components/OfferDetails';
import { ReportList } from '../discounts/components/ReportList';
import {
  businessName,
  getBusiness,
  listBusinessOffers,
  setBusinessOffer,
  withBusinessLinks,
} from './api';
import { businessPath } from './BusinessDirectory';
import { BusinessFollowButton } from './BusinessFollowButton';
import { BusinessDiscovery } from './BusinessDiscovery';
import { BusinessPhoto } from './BusinessPhoto';
import { BusinessOperations } from './BusinessOperations';
import { BusinessMapLink } from './BusinessMapLink';
import { businessCategoryLabels } from './categories';

function OfferPicker({
  businessId,
  version,
  onLink,
}: {
  businessId: string;
  version: number;
  onLink: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState({ term: '', revision: 0 });
  const load = useCallback(
    async (page: number) =>
      withBusinessLinks(
        await searchPublished(
          { query: filter.term, todayOnly: false, endingSoon: false },
          page,
        ),
      ),
    [filter.term],
  );
  return (
    <>
      <form
        className="discount-search"
        aria-label="연결할 혜택 검색"
        onSubmit={(event) => {
          event.preventDefault();
          setFilter((current) => ({
            term: query.trim(),
            revision: current.revision + 1,
          }));
        }}
      >
        <label htmlFor="business-offer-search">연결할 혜택 검색</label>
        <div className="discount-search-row">
          <input
            id="business-offer-search"
            type="search"
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">검색</button>
        </div>
      </form>
      <ReportList
        key={version + '-' + filter.revision}
        title="연결 가능한 공개 혜택"
        empty="검색 조건에 맞는 공개 혜택이 없습니다."
        load={load}
      >
        {(offer) => (
          <>
            <strong>{offer.store_name}</strong>
            <OfferDetails offer={offer} />
            {offer.business ? (
              <p>
                {offer.business.business_id === businessId
                  ? '이 지점에 연결됨'
                  : '다른 지점에 연결됨 · ' + businessName(offer.business)}
              </p>
            ) : (
              <ActionForm
                label="이 지점에 연결"
                submit={async () => {
                  await setBusinessOffer(businessId, offer.id, true);
                  onLink();
                }}
              />
            )}
          </>
        )}
      </ReportList>
    </>
  );
}

function BusinessOffers({ businessId }: { businessId: string }) {
  const { state } = useAuth();
  const userId = state.status === 'ready' ? state.user.id : undefined;
  const canManage = state.status === 'ready' && canReview(state.account.roles);
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [picking, setPicking] = useState(false);
  const load = useCallback(
    async (page: number) =>
      withBookmarkStatus(await listBusinessOffers(businessId, page), userId),
    [businessId, userId],
  );

  function refresh(message: string) {
    setNotice(message);
    setRevision((value) => value + 1);
  }

  return (
    <>
      {notice && <p role="status">{notice}</p>}
      <ReportList
        key={(userId ?? 'guest') + '-' + revision}
        title="이 지점의 공개 혜택"
        empty="이 지점에 연결된 공개 혜택이 없습니다."
        load={load}
      >
        {(offer) => (
          <>
            <strong>{offer.store_name}</strong>
            <OfferDetails offer={offer} />
            {userId && (
              <BookmarkButton offerId={offer.id} initialSaved={offer.saved} />
            )}
            {canManage && (
              <ActionForm
                label="이 지점에서 연결 해제"
                submit={async () => {
                  await setBusinessOffer(businessId, offer.id, false);
                  refresh('혜택 연결을 해제했습니다.');
                }}
              />
            )}
          </>
        )}
      </ReportList>
      {canManage && (
        <details
          className="discount-correction"
          onToggle={(event) => setPicking(event.currentTarget.open)}
        >
          <summary>공개 혜택 연결하기</summary>
          {picking && (
            <OfferPicker
              businessId={businessId}
              version={revision}
              onLink={() => refresh('혜택을 이 지점에 연결했습니다.')}
            />
          )}
        </details>
      )}
    </>
  );
}

async function recordBusinessEvent(
  businessId: string,
  kind: 'view' | 'official_click',
) {
  try {
    await client().rpc('record_discount_business_event', {
      p_business: businessId,
      p_kind: kind,
    });
  } catch {
    // Reporting is optional; the detail page and official link remain available.
  }
}

export function BusinessDetail() {
  const { state } = useAuth();
  const { businessId = '' } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    id: string;
    data: Awaited<ReturnType<typeof getBusiness>>;
    error?: string;
  }>();
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void getBusiness(businessId).then(
      (data) => {
        if (active) setResult({ id: businessId, data });
      },
      (error) => {
        if (active)
          setResult({
            id: businessId,
            data: null,
            error: errorFor(error).message,
          });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, businessId]);
  const current = result?.id === businessId ? result : undefined;
  const business = current?.data;
  const viewedId = business?.id;
  const viewerId = state.status === 'ready' ? state.user.id : undefined;
  useEffect(() => {
    if (viewedId && viewerId) void recordBusinessEvent(viewedId, 'view');
  }, [viewedId, viewerId]);

  return (
    <article className="discounts-page">
      <header>
        <Link to={businessPath}>← 매장·지점</Link>
        <h1>{business ? businessName(business) : '매장 정보'}</h1>
      </header>
      {!supabase ? (
        <p role="status">혜택 서비스 연결 후 매장을 조회할 수 있습니다.</p>
      ) : !current ? (
        <p role="status">매장 정보를 불러오는 중입니다.</p>
      ) : current.error ? (
        <p role="alert">
          {current.error}{' '}
          <button
            type="button"
            onClick={() => {
              setResult(undefined);
              setAttempt((n) => n + 1);
            }}
          >
            다시 확인
          </button>
        </p>
      ) : !business ? (
        <p>등록된 매장을 찾을 수 없습니다.</p>
      ) : (
        <>
          {business.photo_path && (
            <BusinessPhoto
              key={business.photo_path}
              path={business.photo_path}
              name={businessName(business)}
            />
          )}
          <p>{business.address}</p>
          {(business.region || business.category) && (
            <p>
              {[
                business.region,
                business.category && businessCategoryLabels[business.category],
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <div className="discount-utility-links">
            <BusinessMapLink
              address={business.address}
              name={businessName(business)}
            />
            <a
              className="discount-review-link"
              onClick={() => {
                if (viewerId)
                  void recordBusinessEvent(business.id, 'official_click');
              }}
              href={business.source_url}
              target="_blank"
              rel="noreferrer"
            >
              매장 공식 정보 보기
            </a>
          </div>
          {business.description && <p>{business.description}</p>}
          {business.opening_hours && <p>영업시간 {business.opening_hours}</p>}
          {business.menu_url && (
            <a href={business.menu_url} target="_blank" rel="noreferrer">
              메뉴·가격 보기
            </a>
          )}
          <BusinessFollowButton businessId={business.id} />
          <BusinessOperations
            key={`operations-${business.id}-${state.status === 'ready' ? state.user.id : 'guest'}`}
            business={business}
            userId={state.status === 'ready' ? state.user.id : undefined}
            onChanged={() => setAttempt((n) => n + 1)}
          />
          {state.status === 'ready' && canReview(state.account.roles) && (
            <BusinessDiscovery
              key={`discovery-${business.id}`}
              business={business}
              onSaved={() => setAttempt((n) => n + 1)}
            />
          )}
          <BusinessOffers
            key={`offers-${business.id}`}
            businessId={business.id}
          />
        </>
      )}
    </article>
  );
}
