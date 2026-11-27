import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/useAuth';
import { ActionForm } from '../auth/ActionForm';
import { canReview } from '../discounts/api/review';
import { ReportList } from '../discounts/components/ReportList';
import { BusinessMapLink } from './BusinessMapLink';
import { businessName, listBusinesses, registerBusiness } from './api';
import '../discounts/discounts.css';

export const businessPath = '/discounts/business';

export function BusinessDirectory() {
  const { state } = useAuth();
  return (
    <article className="discounts-page">
      <header>
        <Link to="/discounts">← 할인·혜택</Link>
        <h1>매장·지점</h1>
        <div className="discount-utility-links">
          <Link
            className="discount-calendar-link"
            to={businessPath + '/following'}
          >
            관심 매장
          </Link>
          {state.status === 'ready' && canReview(state.account.roles) && (
            <Link className="discount-calendar-link" to={businessPath + '/new'}>
              매장·지점 등록
            </Link>
          )}
        </div>
      </header>
      {state.status === 'unconfigured' ? (
        <p role="status">혜택 서비스 연결 후 매장을 조회할 수 있습니다.</p>
      ) : (
        <ReportList
          title="등록된 매장"
          empty="등록된 매장이 없습니다."
          load={listBusinesses}
        >
          {(business) => (
            <>
              <Link to={businessPath + '/' + business.id}>
                {businessName(business)}
              </Link>
              <p>{business.address}</p>
              <BusinessMapLink
                address={business.address}
                name={businessName(business)}
              />
            </>
          )}
        </ReportList>
      )}
    </article>
  );
}

export function RegisterBusinessPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  return (
    <article className="discounts-page">
      <header>
        <Link to={businessPath}>← 매장·지점</Link>
        <h1>매장·지점 등록</h1>
      </header>
      {state.status === 'ready' && canReview(state.account.roles) ? (
        <section className="discount-form" aria-label="매장 등록 양식">
          <ActionForm
            label="등록하기"
            submit={async (data) => {
              const id = await registerBusiness(data);
              navigate(businessPath + '/' + id, { replace: true });
            }}
          >
            <label>
              매장명
              <input name="name" required maxLength={100} />
            </label>
            <label>
              지점명
              <input name="branch_name" required maxLength={100} />
            </label>
            <label>
              주소 및 위치
              <input name="address" required maxLength={250} />
            </label>
            <label>
              공식 출처 링크
              <input name="source_url" type="url" required maxLength={2048} />
            </label>
          </ActionForm>
        </section>
      ) : state.status === 'loading' ? (
        <p role="status">관리자 권한을 확인하는 중입니다.</p>
      ) : state.status === 'signed-out' ? (
        <p>
          등록하려면 관리자 계정으로 <Link to="/me">로그인</Link>해 주세요.
        </p>
      ) : (
        <p>매장 등록은 관리자에게만 열려 있습니다.</p>
      )}
    </article>
  );
}
