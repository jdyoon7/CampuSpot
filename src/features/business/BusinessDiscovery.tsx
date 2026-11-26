import { useId, useState } from 'react';
import { ActionForm } from '../auth/ActionForm';
import { SchoolSelect } from '../auth/SchoolSelect';
import { saveBusinessDiscovery, type getBusiness } from './api';
import { businessCategoryLabels } from './categories';

export function BusinessDiscovery({
  business,
  onSaved,
}: {
  business: NonNullable<Awaited<ReturnType<typeof getBusiness>>>;
  onSaved: () => void;
}) {
  const categoryLabel = useId();
  const [university, setUniversity] = useState(business.nearby_university_id);
  return (
    <details className="discount-correction">
      <summary>매장 검색 분류 수정</summary>
      <ActionForm
        label="검색 분류 저장"
        submit={async (data) => {
          await saveBusinessDiscovery(business.id, university, data);
          onSaved();
          return '검색 분류를 저장했습니다.';
        }}
      >
        <SchoolSelect
          label="인근 학교"
          table="universities"
          value={university}
          onChange={setUniversity}
        />
        <label>
          지역 (시·구)
          <input
            name="region"
            defaultValue={business.region ?? ''}
            placeholder="예: 서울 성북구"
            maxLength={80}
          />
        </label>
        <label>
          <span id={categoryLabel}>업종</span>
          <select
            aria-labelledby={categoryLabel}
            name="category"
            defaultValue={business.category ?? ''}
          >
            <option value="">선택 안 함</option>
            {Object.entries(businessCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </ActionForm>
    </details>
  );
}
