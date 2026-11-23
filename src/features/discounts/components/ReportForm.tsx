import { useRef, useState, type FormEvent } from 'react';
import { errorFor } from '../../../shared/auth/account';
import { submitReport } from '../api/reports';
import { reportSchema } from '../schemas/report';

export function ReportForm({
  userId,
  onSaved,
}: {
  userId?: string;
  onSaved: () => void;
}) {
  const [period, setPeriod] = useState('fixed');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const sending = useRef(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || sending.current) return;
    const form = e.currentTarget;
    const parsed = reportSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );
    setSuccess('');
    setError('');
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      await submitReport(userId, parsed.data);
      form.reset();
      setPeriod('fixed');
      setSuccess('제보를 접수했습니다. 현재 검수 대기 중입니다.');
      onSaved();
    } catch (err) {
      const failure = errorFor(err);
      setError(failure.message);
      if (failure.code === 'duplicate') onSaved();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="discount-form">
      <fieldset disabled={!userId || busy}>
        <legend>혜택 제보하기</legend>
        <label>
          매장명
          <input
            name="store_name"
            required
            maxLength={100}
            autoComplete="off"
          />
        </label>
        <label>
          할인 내용 및 이용 조건
          <textarea
            name="details"
            required
            maxLength={2000}
            rows={3}
            placeholder="할인율이나 금액, 학생증 제시 등 필요한 조건을 적어 주세요."
          />
        </label>
        <fieldset className="discount-period">
          <legend>혜택 기간</legend>
          <label>
            <input
              name="period"
              type="radio"
              value="fixed"
              checked={period === 'fixed'}
              onChange={() => setPeriod('fixed')}
            />
            기간 지정
          </label>
          <label>
            <input
              name="period"
              type="radio"
              value="ongoing"
              checked={period === 'ongoing'}
              onChange={() => setPeriod('ongoing')}
            />
            상시 혜택
          </label>
        </fieldset>
        {period === 'fixed' && (
          <div className="discount-dates">
            <label>
              시작일
              <input type="date" name="starts_on" required />
            </label>
            <label>
              종료일
              <input type="date" name="ends_on" required />
            </label>
          </div>
        )}
        <label>
          공식 출처 링크
          <input
            name="source_url"
            type="url"
            maxLength={2048}
            required
            placeholder="https://"
            aria-describedby="source-help"
          />
        </label>
        <small id="source-help">
          매장이나 학생회에서 올린 공지 주소를 입력해 주세요.
        </small>
        <button type="submit">{busy ? '접수 중…' : '제보 등록'}</button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
    </form>
  );
}
