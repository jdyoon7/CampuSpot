import { useEffect, useId, useState, type ReactNode } from 'react';
import { errorFor } from '../../../shared/auth/account';

export type ListPage<T> = { items: T[]; hasNext: boolean };
export function ReportList<T extends { id: string }>({
  title,
  empty,
  load,
  children,
}: {
  title: string;
  empty: string;
  load: (page: number) => Promise<ListPage<T>>;
  children: (item: T) => ReactNode;
}) {
  const heading = useId();
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ListPage<T> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setResult(null);
    setError('');
    load(page).then(
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
  }, [page, attempt, load]);
  return (
    <section className="discount-history" aria-labelledby={heading}>
      <h2 id={heading}>{title}</h2>
      {error ? (
        <div role="alert">
          {error}{' '}
          <button onClick={() => setAttempt((n) => n + 1)}>
            다시 불러오기
          </button>
        </div>
      ) : !result ? (
        <p role="status">목록을 불러오는 중입니다.</p>
      ) : (
        <>
          {result.items.length === 0 ? (
            <p>{empty}</p>
          ) : (
            <ul>
              {result.items.map((item) => (
                <li key={item.id}>{children(item)}</li>
              ))}
            </ul>
          )}
          {(page > 0 || result.hasNext) && (
            <div className="discount-pager">
              <button disabled={!page} onClick={() => setPage((p) => p - 1)}>
                이전
              </button>
              <span>{page + 1}페이지</span>
              <button
                disabled={!result.hasNext}
                onClick={() => setPage((p) => p + 1)}
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
