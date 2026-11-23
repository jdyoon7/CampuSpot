import { useCallback } from 'react';
import { formatKoreanDate } from '../../../shared/lib/date';
import { listReports, statusLabels } from '../api/reports';
import { OfferDetails } from './OfferDetails';
import { ReportList } from './ReportList';

export function MyReports({ userId }: { userId: string }) {
  const load = useCallback(
    (page: number) => listReports(userId, page),
    [userId],
  );
  return (
    <ReportList title="내 제보" empty="등록한 제보가 없습니다." load={load}>
      {(r) => (
        <>
          <div className="discount-meta">
            <strong>{r.store_name}</strong>
            <span>{statusLabels[r.status]}</span>
          </div>
          <OfferDetails offer={r} />
          <small>{formatKoreanDate(r.created_at)} 접수</small>
          {r.status === 'rejected' && r.rejection_reason && (
            <p className="discount-review-reason">
              <strong>반려 사유</strong> {r.rejection_reason}
            </p>
          )}
        </>
      )}
    </ReportList>
  );
}
