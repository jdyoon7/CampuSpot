import { useState } from 'react';
import { client } from '../../../shared/auth/account';
import type { Database } from '../../../shared/types/database.generated';
import { ActionForm } from '../../auth/ActionForm';
import { SchoolSelect } from '../../auth/SchoolSelect';
import { operationResult, textField } from '../../business/operations';

type Offer =
  Database['public']['Functions']['search_discount_catalog_ranked']['Returns'][number];

export function OfferTermsForm({
  offer,
  onSaved,
}: {
  offer: Offer;
  onSaved: () => void;
}) {
  const [school, setSchool] = useState<string | null>(
    offer.target_university_id,
  );
  const [campus, setCampus] = useState<string | null>(offer.target_campus_id);
  const [department, setDepartment] = useState<string | null>(
    offer.target_department_id,
  );
  return (
    <details className="discount-correction">
      <summary>혜택 검색 조건 수정</summary>
      <ActionForm
        label="검색 조건 저장"
        submit={async (form) => {
          const percent = textField(form, 'percent'),
            amount = textField(form, 'amount');
          operationResult(
            await client().rpc('set_discount_offer_terms', {
              p_id: offer.id,
              p_percent: percent ? Number(percent) : undefined,
              p_amount: amount ? Number(amount) : undefined,
              p_from: textField(form, 'from') || undefined,
              p_until: textField(form, 'until') || undefined,
              p_school: school ?? undefined,
              p_department: department ?? undefined,
              p_partner: form.has('partner'),
            }),
            '혜택 검색 조건을 저장하지 못했습니다.',
          );
          onSaved();
        }}
      >
        <label>
          할인율 (%)
          <input
            name="percent"
            type="number"
            min={1}
            max={100}
            defaultValue={offer.discount_percent ?? ''}
          />
        </label>
        <label>
          할인 금액 (원)
          <input
            name="amount"
            type="number"
            min={1}
            max={100000000}
            defaultValue={offer.discount_amount ?? ''}
          />
        </label>
        <small>할인율과 할인 금액 중 해당하는 하나만 입력하세요.</small>
        <label>
          이용 시작 시간
          <input
            name="from"
            type="time"
            defaultValue={offer.available_from?.slice(0, 5) ?? ''}
          />
        </label>
        <label>
          이용 종료 시간
          <input
            name="until"
            type="time"
            defaultValue={offer.available_until?.slice(0, 5) ?? ''}
          />
        </label>
        <SchoolSelect
          label="대상 학교"
          table="universities"
          value={school}
          onChange={(value) => {
            setSchool(value);
            setCampus(null);
            setDepartment(null);
          }}
        />
        <SchoolSelect
          label="대상 캠퍼스 선택"
          table="campuses"
          parent={school}
          value={campus}
          onChange={(value) => {
            setCampus(value);
            setDepartment(null);
          }}
        />
        <SchoolSelect
          label="대상 학과"
          table="departments"
          parent={campus}
          value={department}
          onChange={setDepartment}
        />
        <label>
          <input
            name="partner"
            type="checkbox"
            defaultChecked={offer.is_partnership}
          />
          공식 제휴 혜택
        </label>
      </ActionForm>
    </details>
  );
}
