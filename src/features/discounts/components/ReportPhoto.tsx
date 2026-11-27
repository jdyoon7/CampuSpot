import { useEffect, useState } from 'react';
import { readEvidence } from '../api/evidence';

function Photo({ path }: { path: string }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void readEvidence(path).then(
      (blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, attempt]);
  if (url)
    return (
      <img
        className="discount-evidence-image"
        src={url}
        alt="혜택 제보 증빙 사진"
      />
    );
  if (failed)
    return (
      <p role="alert">
        첨부 사진을 불러오지 못했습니다.{' '}
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }}
        >
          다시 열기
        </button>
      </p>
    );
  return <p role="status">첨부 사진을 불러오는 중입니다.</p>;
}

export function ReportPhoto({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="discount-correction"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>첨부 사진 보기</summary>
      {open && <Photo key={path} path={path} />}
    </details>
  );
}
