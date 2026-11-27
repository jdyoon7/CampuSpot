import { useEffect, useId, useState } from 'react';
import {
  businessCategory,
  businessCategoryLabels,
} from '../../business/categories';
import { listCatalogFilters, type SearchFilters } from '../api/search';

type Options = Awaited<ReturnType<typeof listCatalogFilters>>;
type Selections = Pick<SearchFilters, 'university' | 'region' | 'category'>;

export function CatalogFilters({
  value,
  onChange,
}: {
  value: Selections;
  onChange: (next: Selections) => void;
}) {
  const labelId = useId();
  const [options, setOptions] = useState<Options>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void listCatalogFilters().then(
      (next) => {
        if (active) setOptions(next);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  const categories = (options ?? []).flatMap((option) =>
    option.dimension === 'category' &&
    businessCategory.safeParse(option.value).success
      ? [businessCategory.parse(option.value)]
      : [],
  );

  return (
    <>
      <fieldset
        className="discount-catalog-filters"
        disabled={!options}
        aria-label="혜택 검색 분류"
      >
        <label>
          <span id={labelId + '-school'}>학교</span>
          <select
            aria-labelledby={labelId + '-school'}
            value={value.university ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                university: event.target.value || undefined,
              })
            }
          >
            <option value="">모든 학교</option>
            {options
              ?.filter((item) => item.dimension === 'university')
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span id={labelId + '-region'}>지역</span>
          <select
            aria-labelledby={labelId + '-region'}
            value={value.region ?? ''}
            onChange={(event) =>
              onChange({ ...value, region: event.target.value || undefined })
            }
          >
            <option value="">모든 지역</option>
            {options
              ?.filter((item) => item.dimension === 'region')
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span id={labelId + '-category'}>업종</span>
          <select
            aria-labelledby={labelId + '-category'}
            value={value.category ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                category: businessCategory.safeParse(event.target.value).data,
              })
            }
          >
            <option value="">모든 업종</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {businessCategoryLabels[item]}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      {!options && !failed && (
        <p role="status">검색 필터를 불러오는 중입니다.</p>
      )}
      {failed && (
        <div role="alert">
          학교·지역·업종 선택지를 불러오지 못했습니다.{' '}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            다시 불러오기
          </button>
        </div>
      )}
    </>
  );
}
