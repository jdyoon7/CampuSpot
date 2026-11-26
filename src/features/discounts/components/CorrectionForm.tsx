import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../shared/auth/useAuth';
import { ActionForm } from '../../auth/ActionForm';
import { correctionLabels, submitCorrection } from '../api/corrections';

export function CorrectionForm({
  offerId,
  onSaved,
}: {
  offerId: string;
  onSaved?: () => void;
}) {
  const { state } = useAuth();
  const [kind, setKind] = useState('edit');
  const [saved, setSaved] = useState(false);
  return (
    <details className="discount-correction">
      <summary>수정·종료·오류 제보</summary>
      {state.status === 'ready' ? (
        saved ? (
          <p role="status">
            정정 제보를 접수했습니다. 검수 결과는{' '}
            <a href="/discounts#my-corrections">내 정정 제보</a>에서 볼 수
            있어요.
          </p>
        ) : (
          <ActionForm
            label="정정 제보 접수"
            submit={async (data) => {
              await submitCorrection(offerId, data);
              setSaved(true);
              onSaved?.();
            }}
          >
            <label>
              제보 유형
              <select
                name="kind"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {Object.entries(correctionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {kind === 'edit' && (
              <label>
                수정할 할인 내용
                <textarea name="details" rows={3} maxLength={2000} required />
              </label>
            )}
            <label>
              제보 사유
              <textarea name="note" rows={2} maxLength={500} required />
            </label>
          </ActionForm>
        )
      ) : state.status === 'signed-out' ? (
        <p>
          제보하려면 <Link to="/me">로그인</Link>해 주세요.
        </p>
      ) : (
        <p>계정 상태를 확인한 후 제보할 수 있어요.</p>
      )}
    </details>
  );
}
