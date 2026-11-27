import { useCallback, useEffect, useState } from 'react';
import { client, errorFor } from '../../shared/auth/account';
import type { Database } from '../../shared/types/database.generated';
import { ActionForm } from '../auth/ActionForm';
import { pageSize } from '../discounts/api/reports';
import { ReportList } from '../discounts/components/ReportList';
import { operationResult, textField } from './operations';

import { formatSchedule, weekdays } from './schedules';

type MenuItem = Pick<
  Database['public']['Tables']['discount_business_menu_items']['Row'],
  'id' | 'name' | 'description' | 'price_krw'
>;
type Schedule =
  Database['public']['Functions']['list_owned_discount_schedules']['Returns'][number];
type Stats =
  Database['public']['Functions']['get_owned_discount_business_stats']['Returns'][number];

async function loadMenu(id: string, page: number) {
  const data = operationResult(
    await client()
      .from('discount_business_menu_items')
      .select('id,name,description,price_krw')
      .eq('business_id', id)
      .order('created_at')
      .order('id')
      .range(page * pageSize, (page + 1) * pageSize),
    '메뉴를 불러오지 못했습니다.',
  );
  return { items: data.slice(0, pageSize), hasNext: data.length > pageSize };
}
function MenuForm({
  id,
  item,
  onChanged,
}: {
  id: string;
  item?: MenuItem;
  onChanged: () => void;
}) {
  return (
    <ActionForm
      label={item ? '메뉴 수정 저장' : '메뉴 등록'}
      submit={async (form) => {
        operationResult(
          await client().rpc('save_discount_menu_item', {
            p_business: id,
            p_name: textField(form, 'name'),
            p_price: Number(form.get('price')),
            p_description: textField(form, 'description'),
            p_id: item?.id,
          }),
          '메뉴를 저장하지 못했습니다.',
        );
        onChanged();
        return item ? '메뉴를 수정했습니다.' : '메뉴를 등록했습니다.';
      }}
    >
      <label>
        메뉴 이름
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={item?.name ?? ''}
        />
      </label>
      <label>
        가격 (원)
        <input
          name="price"
          required
          type="number"
          min={0}
          max={100000000}
          defaultValue={item?.price_krw ?? ''}
        />
      </label>
      <label>
        메뉴 설명 (선택)
        <textarea
          name="description"
          maxLength={300}
          defaultValue={item?.description ?? ''}
        />
      </label>
    </ActionForm>
  );
}
export function BusinessMenu({
  id,
  owner = false,
}: {
  id: string;
  owner?: boolean;
}) {
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const load = useCallback((page: number) => loadMenu(id, page), [id]);
  function refresh(message: string) {
    setNotice(message);
    setRevision((n) => n + 1);
  }
  return (
    <>
      {owner && (
        <details className="discount-correction">
          <summary>메뉴·가격 관리</summary>
          <MenuForm
            key={'create-' + revision}
            id={id}
            onChanged={() => refresh('메뉴를 등록했습니다.')}
          />
        </details>
      )}
      {notice && <p role="status">{notice}</p>}
      <ReportList
        key={revision}
        title="메뉴·가격"
        empty="등록된 메뉴가 없습니다."
        load={load}
      >
        {(item) => (
          <>
            <div className="discount-meta">
              <strong>{item.name}</strong>
              <span>{item.price_krw.toLocaleString('ko-KR')}원</span>
            </div>
            {item.description && <p>{item.description}</p>}
            {owner && (
              <details className="discount-correction">
                <summary>{item.name} 수정</summary>
                <MenuForm
                  id={id}
                  item={item}
                  onChanged={() => refresh('메뉴를 수정했습니다.')}
                />
                <ActionForm
                  label="메뉴 내리기"
                  submit={async () => {
                    operationResult(
                      await client().rpc('remove_discount_menu_item', {
                        p_business: id,
                        p_id: item.id,
                      }),
                      '메뉴를 내리지 못했습니다.',
                    );
                    refresh('메뉴를 내렸습니다.');
                  }}
                />
              </details>
            )}
          </>
        )}
      </ReportList>
    </>
  );
}

function SalesStats({ id }: { id: string }) {
  const [stats, setStats] = useState<Stats>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = operationResult(
          await client().rpc('get_owned_discount_business_stats', {
            p_business: id,
          }),
          '매장 실적을 불러오지 못했습니다.',
        );
        if (active) setStats(result[0]);
      } catch (err) {
        if (active) setError(errorFor(err).message);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id, attempt]);
  if (error)
    return (
      <p role="alert">
        {error}{' '}
        <button
          type="button"
          onClick={() => {
            setError('');
            setAttempt((n) => n + 1);
          }}
        >
          다시 불러오기
        </button>
      </p>
    );
  if (!stats) return <p role="status">매장 실적을 불러오는 중입니다.</p>;
  return (
    <>
      <p>
        최근 30일 로그인 회원 기준. 회원당 하루에 항목별로 한 번 집계합니다.
      </p>
      <dl className="discount-store-metrics">
        <div>
          <dt>상세 조회</dt>
          <dd>{stats.views_30d.toLocaleString('ko-KR')}</dd>
        </div>
        <div>
          <dt>공식 링크 클릭</dt>
          <dd>{stats.official_clicks_30d.toLocaleString('ko-KR')}</dd>
        </div>
        <div>
          <dt>누적 쿠폰 발급</dt>
          <dd>{stats.coupons_issued.toLocaleString('ko-KR')}</dd>
        </div>
        <div>
          <dt>누적 쿠폰 사용</dt>
          <dd>{stats.coupons_redeemed.toLocaleString('ko-KR')}</dd>
        </div>
      </dl>
    </>
  );
}

function ScheduleForm({
  id,
  schedule,
  onSaved,
}: {
  id: string;
  schedule: Schedule;
  onSaved: () => void;
}) {
  return (
    <ActionForm
      label="일정 변경 검수 요청"
      submit={async (form) => {
        const days = form.getAll('weekday').map(Number);
        operationResult(
          await client().rpc('request_discount_schedule', {
            p_business: id,
            p_offer: schedule.id,
            p_note: textField(form, 'reason'),
            p_start: textField(form, 'start') || undefined,
            p_end: textField(form, 'end') || undefined,
            p_days: days.length ? days : undefined,
            p_from: textField(form, 'from') || undefined,
            p_until: textField(form, 'until') || undefined,
          }),
          '일정 변경을 요청하지 못했습니다.',
        );
        onSaved();
      }}
    >
      <label>
        변경 시작일
        <input
          type="date"
          name="start"
          defaultValue={schedule.starts_on ?? ''}
        />
      </label>
      <label>
        변경 종료일
        <input type="date" name="end" defaultValue={schedule.ends_on ?? ''} />
      </label>
      <small>날짜를 둘 다 비우면 상시 혜택으로 신청합니다.</small>
      <fieldset className="discount-schedule-days">
        <legend>이용 요일</legend>
        {weekdays.map((day, index) => (
          <label key={day}>
            <input
              type="checkbox"
              name="weekday"
              value={index + 1}
              defaultChecked={schedule.weekdays?.includes(index + 1)}
            />
            {day}
          </label>
        ))}
      </fieldset>
      <small>요일을 선택하지 않으면 매일 이용할 수 있습니다.</small>
      <label>
        이용 시작 시간
        <input
          type="time"
          name="from"
          defaultValue={schedule.available_from?.slice(0, 5) ?? ''}
        />
      </label>
      <label>
        이용 종료 시간
        <input
          type="time"
          name="until"
          defaultValue={schedule.available_until?.slice(0, 5) ?? ''}
        />
      </label>
      <label>
        일정 변경 근거
        <textarea name="reason" required maxLength={500} />
      </label>
    </ActionForm>
  );
}
export function OwnedBusinessTools({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const load = useCallback(
    async (page: number) => {
      const data = operationResult(
        await client().rpc('list_owned_discount_schedules', {
          p_business: id,
          p_limit: pageSize + 1,
          p_offset: page * pageSize,
        }),
        '혜택 일정을 불러오지 못했습니다.',
      );
      return {
        items: data.slice(0, pageSize),
        hasNext: data.length > pageSize,
      };
    },
    [id],
  );
  return (
    <details
      className="discount-correction"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>매장 실적과 혜택 일정</summary>
      {open && (
        <>
          <h3>매장 실적</h3>
          <SalesStats id={id} />
          {notice && <p role="status">{notice}</p>}
          <ReportList
            key={revision}
            title="혜택 일정"
            empty="일정을 변경할 수 있는 공개 혜택이 없습니다."
            load={load}
          >
            {(schedule) => (
              <>
                <strong>{schedule.store_name}</strong>
                <p>{formatSchedule(schedule)}</p>
                {schedule.request_status === 'pending' ? (
                  <p>일정 변경 검수 대기</p>
                ) : (
                  <>
                    {schedule.request_status === 'rejected' && (
                      <p>이전 변경 요청이 반려됐습니다.</p>
                    )}
                    <details className="discount-correction">
                      <summary>혜택 일정 변경</summary>
                      <ScheduleForm
                        id={id}
                        schedule={schedule}
                        onSaved={() => {
                          setNotice('일정 변경 검수를 요청했습니다.');
                          setRevision((n) => n + 1);
                        }}
                      />
                    </details>
                  </>
                )}
              </>
            )}
          </ReportList>
        </>
      )}
    </details>
  );
}
