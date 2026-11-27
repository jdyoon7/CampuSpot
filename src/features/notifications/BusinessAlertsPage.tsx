import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AccountError, client, errorFor } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { formatKoreanDate } from '../../shared/lib/date';
import { ActionForm } from '../auth/ActionForm';
import { businessName } from '../business/api';
import { businessPath } from '../business/BusinessDirectory';
import { ReportList } from '../discounts/components/ReportList';
import {
  listBusinessAlerts,
  readBusinessAlert,
  type BusinessAlert,
} from './businessAlerts';

const titles: Record<BusinessAlert['kind'], string> = {
  new_offer: '새 혜택',
  starting: '혜택 시작',
  ending: '마감 임박',
};

function AlertRow({ item }: { item: BusinessAlert }) {
  const [read, setRead] = useState(Boolean(item.read_at));
  return (
    <>
      <div className="discount-meta">
        <strong>
          {titles[item.kind]} · {item.store_name}
        </strong>
        <span>{read ? '읽음' : '안 읽음'}</span>
      </div>
      <Link to={businessPath + '/' + item.business_id}>
        {businessName(item)} 혜택 보기
      </Link>
      {item.kind === 'ending' && item.ends_on && (
        <p>이용 기한 {item.ends_on}</p>
      )}
      {item.kind === 'starting' && item.starts_on && (
        <p>이용 시작일 {item.starts_on}</p>
      )}
      <small>{formatKoreanDate(item.event_at)}</small>
      {!read && (
        <ActionForm
          label="읽음 처리"
          submit={async () => {
            await readBusinessAlert(item);
            setRead(true);
          }}
        />
      )}
    </>
  );
}

function AlertPreferences({ onSaved }: { onSaved: () => void }) {
  const [values, setValues] =
    useState<Record<BusinessAlert['kind'], boolean>>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await client().rpc(
          'get_my_discount_alert_preferences',
        );
        if (error || !data[0]) throw errorFor(error);
        if (active) setValues(data[0]);
      } catch {
        if (active) setFailed(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <details className="discount-correction">
      <summary>알림 유형 설정</summary>
      {failed ? (
        <p role="alert">
          알림 설정을 불러오지 못했습니다.{' '}
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            다시 확인
          </button>
        </p>
      ) : !values ? (
        <p role="status">알림 설정을 불러오는 중입니다.</p>
      ) : (
        <ActionForm
          label="알림 설정 저장"
          submit={async (form) => {
            const next = {
              new_offer: form.has('new_offer'),
              starting: form.has('starting'),
              ending: form.has('ending'),
            };
            const { error } = await client().rpc(
              'set_my_discount_alert_preferences',
              {
                p_new_offer: next.new_offer,
                p_starting: next.starting,
                p_ending: next.ending,
              },
            );
            if (error)
              throw new AccountError(
                'notification_settings',
                '알림 설정을 저장하지 못했습니다.',
                true,
              );
            setValues(next);
            onSaved();
            return '알림 설정을 저장했습니다.';
          }}
        >
          {(['new_offer', 'starting', 'ending'] as const).map((kind) => (
            <label key={kind}>
              <input
                type="checkbox"
                name={kind}
                defaultChecked={values[kind]}
              />
              {titles[kind]}
            </label>
          ))}
        </ActionForm>
      )}
    </details>
  );
}

function Alerts({ userId }: { userId: string }) {
  const [revision, setRevision] = useState(0);
  return (
    <>
      <AlertPreferences onSaved={() => setRevision((n) => n + 1)} />
      <ReportList
        key={userId + '-' + revision}
        title="관심 매장 알림"
        empty="아직 받은 혜택 알림이 없습니다."
        load={listBusinessAlerts}
      >
        {(item) => <AlertRow item={item} />}
      </ReportList>
    </>
  );
}

export function BusinessAlertsPage() {
  const { state, refresh } = useAuth();
  return (
    <article className="discounts-page">
      <header>
        <Link to="/discounts">← 할인·혜택</Link>
        <h1>혜택 알림</h1>
      </header>
      {state.status === 'ready' && (
        <Alerts key={state.user.id} userId={state.user.id} />
      )}
      {state.status === 'signed-out' && (
        <p>
          <Link to="/me">로그인</Link>하면 혜택 알림을 볼 수 있습니다.
        </p>
      )}
      {state.status === 'loading' && (
        <p role="status">로그인 상태를 확인하는 중입니다.</p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          {state.error.message}{' '}
          <button type="button" onClick={refresh}>
            다시 확인
          </button>
        </div>
      )}
      {state.status === 'unconfigured' && (
        <p role="status">계정 서비스 연결 후 혜택 알림을 볼 수 있습니다.</p>
      )}
    </article>
  );
}
