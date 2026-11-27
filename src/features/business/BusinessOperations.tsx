import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { client, errorFor } from '../../shared/auth/account';
import { ActionForm } from '../auth/ActionForm';
import { BusinessMenu, OwnedBusinessTools } from './BusinessManagement';
import { BusinessPhotoEditor } from './BusinessPhoto';
import { SchoolSelect } from '../auth/SchoolSelect';
import { ReportList } from '../discounts/components/ReportList';
import {
  getOperatorStatus,
  listBusinessCoupons,
  operationResult,
  textField,
} from './operations';

type Business = {
  id: string;
  description: string | null;
  opening_hours: string | null;
  menu_url: string | null;
  photo_path: string | null;
};
const labels: Record<string, string> = {
  pending: '운영자 신청 검수 대기 중',
  rejected: '이전 운영자 신청이 반려됐습니다.',
  revoked: '이 지점의 운영 권한이 해제됐습니다.',
};

function OperatorTools({
  business,
  refresh,
}: {
  business: Business;
  refresh: () => void;
}) {
  const [school, setSchool] = useState<string | null>(null);
  return (
    <details className="discount-correction">
      <summary>내 매장 관리</summary>
      <h3>매장 소개 및 영업시간</h3>
      <ActionForm
        label="매장 정보 저장"
        submit={async (form) => {
          operationResult(
            await client().rpc('edit_owned_business', {
              p_business: business.id,
              p_description: textField(form, 'description'),
              p_hours: textField(form, 'hours'),
              p_menu: textField(form, 'menu'),
            }),
            '매장 정보를 저장하지 못했습니다.',
          );
          refresh();
        }}
      >
        <label>
          매장 소개
          <textarea
            name="description"
            maxLength={1200}
            defaultValue={business.description ?? ''}
          />
        </label>
        <label>
          영업시간
          <input
            name="hours"
            maxLength={300}
            defaultValue={business.opening_hours ?? ''}
          />
        </label>
        <label>
          메뉴·가격 안내 링크
          <input
            name="menu"
            type="url"
            maxLength={2048}
            defaultValue={business.menu_url ?? ''}
          />
        </label>
      </ActionForm>
      <BusinessPhotoEditor
        businessId={business.id}
        path={business.photo_path}
        onChanged={refresh}
      />
      <h3>할인 등록</h3>
      <ActionForm
        label="할인 검수 요청"
        submit={async (form) => {
          operationResult(
            await client().rpc('submit_owned_business_offer', {
              p_business: business.id,
              p_title: textField(form, 'title'),
              p_details: textField(form, 'details'),
              p_source: textField(form, 'source'),
              p_start: textField(form, 'start') || undefined,
              p_end: textField(form, 'end') || undefined,
            }),
            '할인 검수를 요청하지 못했습니다.',
          );
          return '할인을 검수 대기 목록에 등록했습니다.';
        }}
      >
        <label>
          할인 제목
          <input name="title" required maxLength={100} />
        </label>
        <label>
          할인 내용 및 조건
          <textarea name="details" required maxLength={2000} />
        </label>
        <label>
          공식 안내 링크
          <input name="source" type="url" required maxLength={2048} />
        </label>
        <label>
          할인 시작일 (선택)
          <input name="start" type="date" />
        </label>
        <label>
          할인 종료일 (선택)
          <input name="end" type="date" />
        </label>
      </ActionForm>
      <h3>쿠폰 발급</h3>
      <ActionForm
        label="쿠폰 캠페인 만들기"
        submit={async (form) => {
          operationResult(
            await client().rpc('create_points_discount_coupon', {
              p_business: business.id,
              p_title: textField(form, 'title'),
              p_terms: textField(form, 'terms'),
              p_start: textField(form, 'start'),
              p_end: textField(form, 'end'),
              p_quantity: Number(form.get('quantity')),
              p_points_cost: Number(form.get('points') ?? 0),
              p_school: school ?? undefined,
            }),
            '쿠폰을 만들지 못했습니다.',
          );
          refresh();
          return '쿠폰 캠페인을 만들었습니다.';
        }}
      >
        <label>
          쿠폰 이름
          <input name="title" required maxLength={100} />
        </label>
        <label>
          사용 조건
          <textarea name="terms" required maxLength={500} />
        </label>
        <label>
          쿠폰 시작일
          <input name="start" type="date" required />
        </label>
        <label>
          쿠폰 종료일
          <input name="end" type="date" required />
        </label>
        <label>
          발급 수량
          <input name="quantity" type="number" min={1} max={10000} required />
        </label>
        <label>
          쿠폰 발급에 필요한 포인트
          <input
            name="points"
            type="number"
            min={0}
            max={100000}
            defaultValue={0}
            required
          />
        </label>
        <SchoolSelect
          label="쿠폰 대상 학교 (선택)"
          table="universities"
          value={school}
          onChange={setSchool}
        />
      </ActionForm>
      <h3>쿠폰 사용 확인</h3>
      <ActionForm
        label="쿠폰 사용 처리"
        submit={async (form) => {
          const title = operationResult(
            await client().rpc('redeem_discount_coupon', {
              p_business: business.id,
              p_code: textField(form, 'code'),
            }),
            '쿠폰을 사용 처리하지 못했습니다.',
          );
          refresh();
          return title + ' 쿠폰을 사용 처리했습니다.';
        }}
      >
        <label>
          고객의 일회용 코드
          <input name="code" required maxLength={36} autoComplete="off" />
        </label>
      </ActionForm>
    </details>
  );
}

export function BusinessOperations({
  business,
  userId,
  onChanged,
}: {
  business: Business;
  userId?: string;
  onChanged: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const [statusRevision, setStatusRevision] = useState(0);
  const [status, setStatus] = useState<string | null>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void getOperatorStatus(business.id, userId).then(
      (next) => {
        if (active) {
          setStatus(next);
          setError('');
        }
      },
      (err) => {
        if (active) setError(errorFor(err).message);
      },
    );
    return () => {
      active = false;
    };
  }, [business.id, userId, statusRevision]);
  const load = useCallback(
    (page: number) => listBusinessCoupons(business.id, page),
    [business.id],
  );
  const owner = status === 'approved';
  function refresh() {
    setRevision((n) => n + 1);
    onChanged();
  }
  return (
    <>
      {userId &&
        (error ? (
          <p role="alert">
            {error}{' '}
            <button
              type="button"
              onClick={() => setStatusRevision((n) => n + 1)}
            >
              다시 확인
            </button>
          </p>
        ) : status === undefined ? (
          <p role="status">매장 운영 권한을 확인하는 중입니다.</p>
        ) : owner ? (
          <>
            <OperatorTools business={business} refresh={refresh} />
            <OwnedBusinessTools id={business.id} />
          </>
        ) : (
          <>
            {status && <p role="status">{labels[status]}</p>}
            {status !== 'pending' && (
              <details className="discount-correction">
                <summary>이 지점의 운영자 신청</summary>
                <ActionForm
                  label="운영 권한 신청"
                  submit={async (form) => {
                    operationResult(
                      await client().rpc('request_business_operator', {
                        p_business: business.id,
                        p_evidence: textField(form, 'evidence'),
                        p_note: textField(form, 'note'),
                      }),
                      '운영 권한을 신청하지 못했습니다.',
                    );
                    setStatus('pending');
                  }}
                >
                  <label>
                    운영자를 확인할 수 있는 공개 링크
                    <input
                      type="url"
                      name="evidence"
                      required
                      maxLength={2048}
                    />
                  </label>
                  <label>
                    확인 방법
                    <textarea name="note" required maxLength={500} />
                  </label>
                </ActionForm>
              </details>
            )}
          </>
        ))}
      <BusinessMenu id={business.id} owner={owner} />
      <ReportList
        key={'coupons-' + revision}
        title="매장 쿠폰"
        empty="현재 받을 수 있는 쿠폰이 없습니다."
        load={load}
      >
        {(coupon) => (
          <>
            <strong>{coupon.title}</strong>
            <p>{coupon.terms}</p>
            <p>
              {coupon.starts_on} ~ {coupon.ends_on} ·{' '}
              {coupon.school ? coupon.school + ' 인증 회원' : '모든 회원'}
            </p>
            {coupon.points_cost > 0 && (
              <p>발급 시 {coupon.points_cost.toLocaleString('ko-KR')}P 차감</p>
            )}
            {owner && (
              <p>
                발급 {coupon.issued}건 · 사용 {coupon.used}건
              </p>
            )}
            {owner && (
              <ActionForm
                label={coupon.active ? '발급·사용 중지' : '쿠폰 다시 열기'}
                submit={async () => {
                  operationResult(
                    await client().rpc('set_discount_coupon_active', {
                      p_campaign: coupon.id,
                      p_active: !coupon.active,
                    }),
                    '쿠폰 상태를 변경하지 못했습니다.',
                  );
                  setRevision((n) => n + 1);
                }}
              />
            )}
            {coupon.claimed ? (
              <Link to="/discounts/coupons">내 쿠폰 보기</Link>
            ) : owner ? null : !userId ? (
              <Link to="/me">쿠폰을 받으려면 로그인</Link>
            ) : coupon.remaining > 0 ? (
              <ActionForm
                label={
                  coupon.points_cost > 0
                    ? `${coupon.points_cost.toLocaleString('ko-KR')}P 사용해 쿠폰 받기`
                    : '쿠폰 받기'
                }
                submit={async () => {
                  operationResult(
                    await client().rpc('claim_discount_coupon', {
                      p_campaign: coupon.id,
                    }),
                    '쿠폰을 발급받지 못했습니다.',
                  );
                  setRevision((n) => n + 1);
                }}
              />
            ) : (
              <p>발급 마감</p>
            )}
          </>
        )}
      </ReportList>
    </>
  );
}
