import { useId, useState } from 'react';
import { AccountError, client } from '../../shared/auth/account';
import { operationResult, textField } from './operations';
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
      <h3>거리순 검색용 위치</h3>
      <ActionForm
        label="매장 좌표 저장"
        submit={async (form) => {
          const lat = textField(form, 'lat'),
            lng = textField(form, 'lng');
          if (Boolean(lat) !== Boolean(lng))
            throw new AccountError(
              'coords',
              '위도와 경도를 함께 입력하거나 모두 비워 주세요.',
            );
          operationResult(
            await client().rpc('set_discount_business_coordinates', {
              p_business: business.id,
              p_lat: lat ? Number(lat) : undefined,
              p_lng: lng ? Number(lng) : undefined,
            }),
            '매장 위치를 저장하지 못했습니다.',
          );
          onSaved();
          return '매장 위치를 저장했습니다.';
        }}
      >
        <label>
          위도
          <input
            name="lat"
            type="number"
            min={-90}
            max={90}
            step="any"
            defaultValue={business.latitude ?? ''}
          />
        </label>
        <label>
          경도
          <input
            name="lng"
            type="number"
            min={-180}
            max={180}
            step="any"
            defaultValue={business.longitude ?? ''}
          />
        </label>
      </ActionForm>
    </details>
  );
}
