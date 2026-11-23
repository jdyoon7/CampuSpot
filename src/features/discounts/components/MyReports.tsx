import { useEffect, useState } from 'react';
import { errorFor } from '../../../shared/auth/account';
import { formatKoreanDate } from '../../../shared/lib/date';
import { listReports, statusLabels } from '../api/reports';

export function MyReports({ userId }: { userId: string }) {
  const [page, setPage] = useState(0),
    [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Awaited<
      ReturnType<typeof listReports>
    > | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    setResult(null);
    listReports(userId, page).then(
      (data) => {
        if (active) setResult(data);
      },
      (err) => {
        if (active) setError(errorFor(err).message);
      },
    );
    return () => {
      active = false;
    };
  }, [userId, page, attempt]);
  return (
    <section aria-labelledby="my-reports-heading" className="discount-history">
      <h2 id="my-reports-heading">내 제보</h2>
      {error ? (
        <div role="alert">
          {error}{' '}
          <button onClick={() => setAttempt((v) => v + 1)}>
            다시 불러오기
          </button>
        </div>
      ) : !result ? (
        <p role="status">제보를 불러오는 중입니다.</p>
      ) : (
        <>
          {!result.items.length && <p>등록한 제보가 없습니다.</p>}
          <ul>
            {result.items.map((r) => (
              <li key={r.id}>
                <div className="discount-meta">
                  <strong>{r.store_name}</strong>
                  <span>{statusLabels[r.status]}</span>
                </div>
                <p>{r.details}</p>
                <small>
                  {r.starts_on && r.ends_on
                    ? r.starts_on + ' ~ ' + r.ends_on
                    : '상시 혜택'}{' '}
                  · {formatKoreanDate(r.created_at)} 접수
                </small>
                <a href={r.source_url} target="_blank" rel="noreferrer">
                  공식 공지 보기
                </a>
              </li>
            ))}
          </ul>
          {(page > 0 || result.hasNext) && (
            <div className="discount-pager">
              <button disabled={!page} onClick={() => setPage((v) => v - 1)}>
                이전
              </button>
              <span>{page + 1}페이지</span>
              <button
                disabled={!result.hasNext}
                onClick={() => setPage((v) => v + 1)}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
