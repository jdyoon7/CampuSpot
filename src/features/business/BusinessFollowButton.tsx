import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorFor } from '../../shared/auth/account';
import { useAuth } from '../../shared/auth/useAuth';
import { isFollowingBusiness, setBusinessFollow } from './follows';

function FollowControl({
  userId,
  businessId,
}: {
  userId: string;
  businessId: string;
}) {
  const [followed, setFollowed] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void isFollowingBusiness(userId, businessId).then(
      (result) => {
        if (active) setFollowed(result);
      },
      (failure) => {
        if (active) setError(errorFor(failure).message);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, businessId, userId]);

  async function toggle() {
    if (followed === null || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await setBusinessFollow(businessId, !followed);
      setFollowed(!followed);
    } catch (failure) {
      setError(errorFor(failure).message);
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  return (
    <>
      {followed === null ? (
        error ? (
          <div role="alert">
            {error}{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setAttempt((n) => n + 1);
              }}
            >
              다시 확인
            </button>
          </div>
        ) : (
          <p role="status">팔로우 상태를 확인하는 중입니다.</p>
        )
      ) : (
        <button
          type="button"
          className="discount-bookmark"
          disabled={busy}
          aria-pressed={followed}
          onClick={() => void toggle()}
        >
          <Heart
            size={18}
            fill={followed ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
          {followed ? '팔로우 해제' : '이 지점 팔로우'}
        </button>
      )}
      {followed !== null && error && <p role="alert">{error}</p>}
    </>
  );
}

export function BusinessFollowButton({ businessId }: { businessId: string }) {
  const { state } = useAuth();
  if (state.status === 'ready')
    return (
      <FollowControl
        key={state.user.id + businessId}
        userId={state.user.id}
        businessId={businessId}
      />
    );
  if (state.status === 'signed-out')
    return (
      <p className="discount-notice">
        <Link to="/me">로그인</Link>하면 이 지점을 팔로우할 수 있습니다.
      </p>
    );
  return null;
}
