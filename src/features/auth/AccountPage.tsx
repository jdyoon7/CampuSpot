import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/useAuth';
import { client } from '../../shared/auth/account';
import { ActionForm } from './ActionForm';
import { EmailAccess } from './EmailAccess';
import { MemberPanel } from './MemberPanel';
import './account.css';

export function AccountPage() {
  const { state, refresh } = useAuth(),
    reset = useLocation().pathname === '/me/reset',
    navigate = useNavigate();
  let content;
  if (state.status === 'unconfigured')
    content = (
      <section role="status">
        계정 서비스 연결을 기다리고 있습니다. 연결 후 회원가입과 로그인을 이용할
        수 있습니다.
      </section>
    );
  else if (state.status === 'loading')
    content = <p role="status">계정 정보를 불러오는 중입니다.</p>;
  else if (reset && state.status === 'signed-out')
    content = (
      <section>
        <p>복구 링크가 만료되었거나 세션이 없습니다.</p>
        <Link to="/me">새 복구 메일 요청하기</Link>
      </section>
    );
  else if (reset)
    content = (
      <ActionForm
        label="비밀번호 변경"
        submit={async (data) => {
          const { error } = await client().auth.updateUser({
            password: String(data.get('password')),
          });
          if (error) throw error;
          navigate('/me', { replace: true });
        }}
      >
        <label>
          새 비밀번호 (8자 이상)
          <input
            type="password"
            name="password"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </label>
      </ActionForm>
    );
  else if (state.status === 'signed-out') content = <EmailAccess />;
  else if (state.status === 'error')
    content = (
      <section>
        <p role="alert">{state.error.message}</p>
        <button onClick={refresh}>다시 불러오기</button>
        <ActionForm
          label="로그아웃"
          submit={async () => {
            const { error } = await client().auth.signOut({ scope: 'local' });
            if (error) throw error;
          }}
        />
      </section>
    );
  else if (state.status === 'ready')
    content = <MemberPanel key={state.user.id} state={state} />;
  return (
    <article className="account">
      <h1>{reset ? '비밀번호 재설정' : '마이페이지'}</h1>
      {content}
    </article>
  );
}
