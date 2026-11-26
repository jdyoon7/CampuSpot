import { useCallback } from 'react';
import { correctionLabels, loadCorrections } from '../api/corrections';
import { statusLabels } from '../api/reports';
import { ReportList } from './ReportList';

export function MyCorrections({ userId }: { userId: string }) {
  const load = useCallback(
    (page: number) => loadCorrections(userId, page, false),
    [userId],
  );
  return (
    <div id="my-corrections">
      <ReportList
        title="내 정정 제보"
        empty="등록한 정정 제보가 없습니다."
        load={load}
      >
        {(item) => (
          <>
            <div className="discount-meta">
              <strong>
                {item.store_name} · {correctionLabels[item.kind]}
              </strong>
              <span>{statusLabels[item.status]}</span>
            </div>
            <p>{item.report_note}</p>
            {item.proposed_details && (
              <p>
                <strong>수정 내용</strong> {item.proposed_details}
              </p>
            )}
            {item.rejection_reason && (
              <p className="discount-review-reason">
                <strong>반려 사유</strong> {item.rejection_reason}
              </p>
            )}
          </>
        )}
      </ReportList>
    </div>
  );
}
