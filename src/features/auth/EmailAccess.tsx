import { useState } from 'react';
import { z } from 'zod';
import { AccountError, client } from '../../shared/auth/account';
import { ActionForm } from './ActionForm';
export function EmailAccess() {
  const [mode, setMode] = useState<'로그인' | '회원가입' | '비밀번호 찾기'>(
    '로그인',
  );
  async function submit(data: FormData) {
    const email = z.email().safeParse(String(data.get('email')).trim());
    if (!email.success)
      throw new AccountError('email', '이메일 주소를 확인하세요.');
    const password = String(data.get('password') ?? '');
    const auth = client().auth;
    if (mode === '비밀번호 찾기') {
      const { error } = await auth.resetPasswordForEmail(email.data, {
        redirectTo: location.origin + '/me/reset',
      });
      if (error) throw error;
      return '가입한 주소라면 복구 메일이 도착합니다.';
    }
    if (mode === '회원가입') {
      if (password.length < 8)
        throw new AccountError('password', '8자 이상 입력하세요.');
      const { error } = await auth.signUp({
        email: email.data,
        password,
        options: { emailRedirectTo: location.origin + '/me' },
      });
      if (error)
        throw new AccountError(
          'signup',
          '가입 요청을 처리하지 못했습니다. 입력한 값과 메일 발송 제한을 확인하세요.',
        );
      return '받은 메일의 가입 확인 링크를 열어 주세요.';
    }
    const { error } = await auth.signInWithPassword({
      email: email.data,
      password,
    });
    if (error)
      throw new AccountError(
        'login',
        '이메일·비밀번호와 가입 메일 인증 여부를 확인하세요.',
      );
  }
  return (
    <section>
      <div className="account-tabs">
        {(['로그인', '회원가입', '비밀번호 찾기'] as const).map((m) => (
          <button
            type="button"
            key={m}
            aria-pressed={m === mode}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <ActionForm
        key={mode}
        label={mode === '비밀번호 찾기' ? '복구 메일 받기' : mode}
        submit={submit}
      >
        <label>
          이메일
          <input type="email" name="email" autoComplete="email" required />
        </label>
        {mode !== '비밀번호 찾기' && (
          <label>
            비밀번호
            <input
              type="password"
              name="password"
              minLength={mode === '회원가입' ? 8 : 1}
              autoComplete={
                mode === '회원가입' ? 'new-password' : 'current-password'
              }
              required
            />
          </label>
        )}
      </ActionForm>
      <p>Google·Kakao·Apple 로그인은 준비 중입니다.</p>
    </section>
  );
}
