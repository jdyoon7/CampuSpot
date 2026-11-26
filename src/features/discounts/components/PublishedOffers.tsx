import { useCallback, useState } from 'react';
import { formatKoreanDate } from '../../../shared/lib/date';
import { searchPublished, type SearchFilters } from '../api/search';
import { ReportList } from './ReportList';
import { OfferDetails } from './OfferDetails';
import { CorrectionForm } from './CorrectionForm';

const emptyFilters: SearchFilters = {
  query: '',
  todayOnly: false,
  endingSoon: false,
};

export function PublishedOffers({
  onCorrectionSaved,
}: {
  onCorrectionSaved: () => void;
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
    (page: number) => searchPublished(applied, page),
    [applied],
  );
  const hasFilters = Boolean(
    applied.query || applied.todayOnly || applied.endingSoon,
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
        key={revision}
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
            <small>{formatKoreanDate(offer.verified_at)} 검수</small>
            <CorrectionForm offerId={offer.id} onSaved={onCorrectionSaved} />
          </>
        )}
      </ReportList>
    </>
  );
}
