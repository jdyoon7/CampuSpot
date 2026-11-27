import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { withBusinessLinks } from '../../business/api';
import { formatKoreanDate } from '../../../shared/lib/date';
import { searchPublished, type SearchFilters } from '../api/search';
import { withBookmarkStatus } from '../api/bookmarks';
import { BookmarkButton } from './BookmarkButton';
import { ReportList } from './ReportList';
import { OfferDetails } from './OfferDetails';
import { CorrectionForm } from './CorrectionForm';
import { CatalogFilters } from './CatalogFilters';

const emptyFilters: SearchFilters = {
  query: '',
  todayOnly: false,
  endingSoon: false,
};

export function PublishedOffers({
  onCorrectionSaved,
  userId,
}: {
  onCorrectionSaved: () => void;
  userId?: string;
}) {
  const [draft, setDraft] = useState(emptyFilters);
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
    applied.category,
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
