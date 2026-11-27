import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/useAuth';
import { errorFor } from '../../shared/auth/account';
import { formatKoreanDate } from '../../shared/lib/date';
import {
  correctionLabels,
  loadCorrections,
  reviewCorrection,
} from './api/corrections';
import {
  canReview,
  loadQueue,
  reviewReport,
  type Decision,
} from './api/review';
import { ReportList } from './components/ReportList';
import { ReportPhoto } from './components/ReportPhoto';
import { OfferDetails } from './components/OfferDetails';

function ReviewActions({
  itemId,
  storeName,
  approveLabel = '승인',
  review,
  onChange,
}: {
  itemId: string;
  storeName: string;
  approveLabel?: string;
  review: (id: string, decision: Decision) => Promise<void>;
  onChange: (message: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function decide(decision: Decision) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await review(itemId, decision);
      onChange(
        storeName +
          ' 제보를 ' +
          (decision.status === 'approved' ? '승인했습니다.' : '반려했습니다.'),
      );
    } catch (err) {
      const failure = errorFor(err);
      if (failure.code === 'not_pending') {
        onChange(failure.message);
      } else setError(failure.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      {rejecting ? (
        <form
          className="discount-review-form"
          onSubmit={(e) => {
            e.preventDefault();
            void decide({ status: 'rejected', reason });
          }}
        >
          <label>
            반려 사유
            <textarea
              required
              maxLength={500}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              aria-describedby={'hint-' + itemId}
            />
          </label>
          <small id={'hint-' + itemId}>
            제보자에게 전달됩니다. 어떤 정보를 확인하거나 수정해야 하는지 적어
            주세요.
          </small>
          <div className="discount-actions">
            <button disabled={busy || !reason.trim()} type="submit">
              반려 확정
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() => {
                setRejecting(false);
                setError('');
              }}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="discount-actions">
          <button
            disabled={busy}
            className="discount-approve"
            onClick={() => void decide({ status: 'approved' })}
          >
            {approveLabel}
          </button>
          <button disabled={busy} onClick={() => setRejecting(true)}>
            반려
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
function ReviewQueue({ userId }: { userId: string }) {
  const load = useCallback((page: number) => loadQueue(userId, page), [userId]);
  const loadEdits = useCallback(
    (page: number) => loadCorrections(userId, page, true),
    [userId],
  );
  const [correctionRevision, setCorrectionRevision] = useState(0);
  const [revision, setRevision] = useState(0),
    [notice, setNotice] = useState('');
  return (
    <>
      <p>공식 공지에서 할인 내용과 기간을 확인한 뒤 결정해 주세요.</p>
      <button
        type="button"
        onClick={() => {
          setNotice('');
          setRevision((n) => n + 1);
          setCorrectionRevision((n) => n + 1);
        }}
      >
        목록 새로고침
      </button>
      {notice && <p role="status">{notice}</p>}
      <ReportList
        key={revision}
        title="검수 대기"
        empty="검수할 제보가 없습니다."
        load={load}
      >
        {(item) => (
          <>
            <strong>{item.store_name}</strong>
            <OfferDetails offer={item} />
            {item.photo && <ReportPhoto path={item.photo} />}
            <small>{formatKoreanDate(item.created_at)} 접수</small>
            <ReviewActions
              itemId={item.id}
              storeName={item.store_name}
              review={reviewReport}
              onChange={(message) => {
                setNotice(message);
                setRevision((n) => n + 1);
              }}
            />
          </>
        )}
      </ReportList>
      <ReportList
        key={'corrections-' + correctionRevision}
        title="정정 제보 검수 대기"
        empty="검수할 정정 제보가 없습니다."
        load={loadEdits}
      >
        {(item) => (
          <>
            <strong>
              {item.store_name} · {correctionLabels[item.kind]}
            </strong>
            <p>
              <strong>접수 당시 내용</strong> {item.current_details}
            </p>
            {item.proposed_details && (
              <p>
                <strong>수정 제안</strong> {item.proposed_details}
              </p>
            )}
            <p>
              <strong>제보 사유</strong> {item.report_note}
            </p>
            <a href={item.source_url} target="_blank" rel="noreferrer">
              공식 공지 보기
            </a>
            <ReviewActions
              itemId={item.id}
              storeName={item.store_name + ' 정정'}
              approveLabel={
                item.kind === 'edit' ? '수정 승인' : '공개 중단 승인'
              }
              review={reviewCorrection}
              onChange={(message) => {
                setNotice(message);
                setCorrectionRevision((n) => n + 1);
              }}
            />
          </>
        )}
      </ReportList>
    </>
  );
}
export function ReviewPage() {
  const { state, refresh } = useAuth();
  return (
    <article className="discounts-page">
      <Link to="/discounts">← 할인·혜택</Link>
      <header>
        <h1>혜택 제보 검수</h1>
      </header>
      {state.status === 'ready' && canReview(state.account.roles) && (
        <Link className="discount-review-link" to="/discounts/review/operators">
          매장 운영자 검수
        </Link>
      )}
      {state.status === 'ready' && canReview(state.account.roles) && (
        <Link className="discount-review-link" to="/discounts/review/points">
          제보 포인트 검수
        </Link>
      )}
      {state.status === 'ready' &&
        (canReview(state.account.roles) ? (
          <ReviewQueue key={state.user.id} userId={state.user.id} />
        ) : (
          <p>관리자 권한이 필요합니다.</p>
        ))}
      {state.status === 'signed-out' && (
        <p>
          관리자 계정으로 로그인해 주세요. <Link to="/me">로그인하기</Link>
        </p>
      )}
      {state.status === 'loading' && (
        <p role="status">권한을 확인하는 중입니다.</p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          {state.error.message} <button onClick={refresh}>다시 확인</button>
        </div>
      )}
      {state.status === 'unconfigured' && (
        <p>계정 서비스 연결 후 검수할 수 있습니다.</p>
      )}
    </article>
  );
}
