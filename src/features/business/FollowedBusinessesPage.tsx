import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/useAuth';
import { businessName } from './api';
import { businessPath } from './BusinessDirectory';
import { listFollowedBusinesses } from './follows';
import { ReportList } from '../discounts/components/ReportList';

export function FollowedBusinessesPage() {
  const { state, refresh } = useAuth();
  return (
    <article className="discounts-page">
      <header>
        <Link to={businessPath}>← 매장·지점</Link>
        <h1>관심 매장</h1>
      </header>
      {state.status === 'ready' && (
        <ReportList
          key={state.user.id}
          title="팔로우한 지점"
          empty="팔로우한 지점이 없습니다."
          load={listFollowedBusinesses}
        >
          {(item) => (
            <>
              <Link to={businessPath + '/' + item.id}>
                {businessName(item)}
              </Link>
              <p>{item.address}</p>
            </>
          )}
        </ReportList>
      )}
      {state.status === 'signed-out' && (
        <p>
          <Link to="/me">로그인</Link>하면 관심 매장을 볼 수 있습니다.
        </p>
      )}
      {state.status === 'loading' && (
        <p role="status">로그인 상태를 확인하는 중입니다.</p>
      )}
      {state.status === 'error' && (
        <div role="alert">
          {state.error.message}{' '}
          <button type="button" onClick={refresh}>
            다시 확인
          </button>
        </div>
      )}
      {state.status === 'unconfigured' && (
        <p role="status">계정 서비스 연결 후 관심 매장을 볼 수 있습니다.</p>
      )}
    </article>
  );
}
