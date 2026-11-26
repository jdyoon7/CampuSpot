import { useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { errorFor } from '../../../shared/auth/account';
import { setOfferBookmark } from '../api/bookmarks';

export function BookmarkButton({
  offerId,
  initialSaved,
  onRemove,
}: {
  offerId: string;
  initialSaved: boolean;
  onRemove?: () => void;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await setOfferBookmark(offerId, !saved);
      setSaved(!saved);
      if (saved) onRemove?.();
    } catch (failure) {
      setError(errorFor(failure).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="discount-bookmark"
        type="button"
        aria-pressed={saved}
        disabled={busy}
        onClick={() => void toggle()}
      >
        <Bookmark
          size={17}
          fill={saved ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
        {saved ? '저장 해제' : '혜택 저장'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
