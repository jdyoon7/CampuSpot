import { useState, type FormEvent, type PropsWithChildren } from 'react';
import { errorFor } from '../../shared/auth/account';

export function ActionForm({
  submit,
  label,
  children,
}: PropsWithChildren<{
  label: string;
  submit: (data: FormData) => Promise<string | void>;
}>) {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [failure, setFailure] = useState(false);
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setNotice('');
    setBusy(true);
    setFailure(false);
    try {
      setNotice((await submit(data)) || '저장했습니다.');
    } catch (error) {
      setFailure(true);
      setNotice(errorFor(error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={handle}>
      <fieldset disabled={busy}>
        {children}
        <button type="submit">{busy ? '처리 중…' : label}</button>
      </fieldset>
      {notice && <p role={failure ? 'alert' : 'status'}>{notice}</p>}
    </form>
  );
}
