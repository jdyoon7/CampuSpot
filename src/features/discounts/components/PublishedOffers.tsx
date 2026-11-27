import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { withBusinessLinks } from '../../business/api';
import { formatKoreanDate } from '../../../shared/lib/date';
import {
  discountSort,
  searchPublished,
  type SearchFilters,
} from '../api/search';
import { withBookmarkStatus } from '../api/bookmarks';
import { BookmarkButton } from './BookmarkButton';
import { ReportList } from './ReportList';
import { OfferDetails } from './OfferDetails';
import { CorrectionForm } from './CorrectionForm';
import { OfferTermsForm } from './OfferTermsForm';
import { CatalogFilters } from './CatalogFilters';

const emptyFilters: SearchFilters = {
  query: '',
  todayOnly: false,
  endingSoon: false,
};

export function PublishedOffers({
  onCorrectionSaved,
  userId,
  canEdit,
}: {
  onCorrectionSaved: () => void;
  userId?: string;
  canEdit?: boolean;
}) {
  const [draft, setDraft] = useState(emptyFilters);
  const [notice, setNotice] = useState('');
  const [{ filters: applied, revision }, setSearch] = useState({
    filters: emptyFilters,
    revision: 0,
  });
  function apply(filters: SearchFilters) {
    setSearch((current) => ({ filters, revision: current.revision + 1 }));
  }
  const load = useCallback(
    async (page: number) =>
      withBusinessLinks(
        await withBookmarkStatus(await searchPublished(applied, page), userId),
      ),
    [applied, userId],
  );
  const hasFilters = Boolean(
    applied.query ||
    applied.todayOnly ||
    applied.endingSoon ||
    applied.university ||
    applied.region ||
    applied.category ||
    applied.nowOnly ||
    applied.partnerOnly,
  );
  function reset() {
    setDraft(emptyFilters);
    apply(emptyFilters);
  }
  return (
    <>
      <form
        role="search"
        aria-label="공개 혜택 검색"
        className="discount-search"
        onSubmit={(e) => {
          e.preventDefault();
          setNotice('');
          apply({ ...draft, query: draft.query.trim() });
        }}
      >
        <label htmlFor="benefit-search">매장명 또는 할인 내용</label>
        <div className="discount-search-row">
          <input
            id="benefit-search"
            type="search"
            maxLength={100}
            value={draft.query}
            onChange={(e) => setDraft({ ...draft, query: e.target.value })}
          />
          <button type="submit">검색</button>
        </div>
        <CatalogFilters
          value={{
            university: draft.university,
            region: draft.region,
            category: draft.category,
          }}
          onChange={(selection) =>
            setDraft((current) => ({ ...current, ...selection }))
          }
        />
        <div className="discount-search-filters">
          <label>
            정렬
            <select
              aria-label="혜택 정렬"
              value={draft.sort ?? 'recent'}
              onChange={(e) =>
                setDraft({ ...draft, sort: discountSort.parse(e.target.value) })
              }
            >
              <option value="recent">최근 검수순</option>
              <option value="percent">할인율 높은순</option>
              <option value="amount">할인 금액 높은순</option>
              <option value="popular">저장 많은순</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.nowOnly ?? false}
              onChange={(e) =>
                setDraft({ ...draft, nowOnly: e.target.checked })
              }
            />
            지금 이용 가능
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.partnerOnly ?? false}
              onChange={(e) =>
                setDraft({ ...draft, partnerOnly: e.target.checked })
              }
            />
            제휴 혜택만
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.todayOnly}
              onChange={(e) =>
                setDraft({ ...draft, todayOnly: e.target.checked })
              }
            />
            오늘 이용 가능
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.endingSoon}
              onChange={(e) =>
                setDraft({ ...draft, endingSoon: e.target.checked })
              }
            />
            마감 임박 (7일 이내)
          </label>
          <button type="button" onClick={reset}>
            초기화
          </button>
        </div>
      </form>
      {notice && <p role="status">{notice}</p>}
      <ReportList
        key={(userId ?? 'guest') + '-' + revision}
        title="공개 혜택"
        empty={
          hasFilters
            ? '조건에 맞는 혜택이 없습니다.'
            : '아직 공개된 혜택이 없습니다.'
        }
        load={load}
      >
        {(offer) => (
          <>
            <strong>{offer.store_name}</strong>
            <OfferDetails offer={offer} />
            {offer.discount_percent && <p>{offer.discount_percent}% 할인</p>}
            {offer.discount_amount && (
              <p>{offer.discount_amount.toLocaleString('ko-KR')}원 할인</p>
            )}
            {offer.available_from && offer.available_until && (
              <p>
                이용 시간 {offer.available_from.slice(0, 5)}–
                {offer.available_until.slice(0, 5)}
              </p>
            )}
            {offer.target_school && (
              <p>
                대상 {offer.target_school}
                {offer.target_department ? ' · ' + offer.target_department : ''}
              </p>
            )}
            {offer.is_partnership && <small>공식 제휴</small>}
            {canEdit && (
              <OfferTermsForm
                offer={offer}
                onSaved={() => {
                  setNotice('혜택 검색 조건을 저장했습니다.');
                  apply(applied);
                }}
              />
            )}
            {offer.business && (
              <Link to={'/discounts/business/' + offer.business.business_id}>
                매장 정보 · {offer.business.branch_name}
              </Link>
            )}
            <small>{formatKoreanDate(offer.verified_at)} 검수</small>
            {userId && (
              <BookmarkButton offerId={offer.id} initialSaved={offer.saved} />
            )}
            <CorrectionForm offerId={offer.id} onSaved={onCorrectionSaved} />
          </>
        )}
      </ReportList>
    </>
  );
}
