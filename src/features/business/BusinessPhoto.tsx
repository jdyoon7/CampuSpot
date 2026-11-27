import { FunctionsHttpError } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { AccountError, client } from '../../shared/auth/account';
import { invalidImage, prepareImage } from '../../shared/lib/uploadImage';
import { ActionForm } from '../auth/ActionForm';

async function changePhoto(businessId: string, file?: File) {
  const body = new FormData();
  body.append('business', businessId);
  body.append('action', file ? 'save' : 'remove');
  if (file) body.append('image', await prepareImage(file), 'photo.png');
  const { error } = await client().functions.invoke('discount-business-photo', {
    body,
  });
  if (!error) return;
  if (error instanceof FunctionsHttpError) {
    const result = (await error.context.json().catch(() => null)) as {
      code?: string;
    } | null;
    if (result?.code === 'image') throw invalidImage();
    if (result?.code === 'forbidden')
      throw new AccountError(
        'photo_forbidden',
        '승인된 지점 운영자만 사진을 수정할 수 있습니다.',
      );
    if (result?.code === 'conflict')
      throw new AccountError(
        'photo_conflict',
        '다른 사람이 사진을 변경했습니다. 새로고침 후 다시 시도해 주세요.',
      );
  }
  throw new AccountError(
    'photo_failed',
    '매장 사진을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    true,
  );
}

export function BusinessPhotoEditor({
  businessId,
  path,
  onChanged,
}: {
  businessId: string;
  path: string | null;
  onChanged: () => void;
}) {
  return (
    <>
      <h3>매장 사진</h3>
      <ActionForm
        label="대표 사진 공개"
        submit={async (data) => {
          const file = data.get('photo');
          if (!(file instanceof File) || !file.name) throw invalidImage();
          await changePhoto(businessId, file);
          onChanged();
          return '대표 사진을 공개했습니다.';
        }}
      >
        <label>
          공개할 매장 사진 (JPG·PNG)
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png"
            required
          />
        </label>
        <small>매장 사진은 지점 상세에 공개됩니다.</small>
      </ActionForm>
      {path && (
        <ActionForm
          key={path}
          label="대표 사진 내리기"
          submit={async () => {
            await changePhoto(businessId);
            onChanged();
          }}
        />
      )}
    </>
  );
}

export function BusinessPhoto({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void client()
      .storage.from('business-photos')
      .createSignedUrl(path, 120)
      .then(({ data, error }) => {
        if (active) {
          if (error) setFailed(true);
          else setUrl(data.signedUrl);
        }
      });
    return () => {
      active = false;
    };
  }, [path]);
  if (failed) return <p role="status">매장 사진을 불러오지 못했습니다.</p>;
  return url ? (
    <img
      className="discount-business-photo"
      src={url}
      alt={name + ' 매장 사진'}
      onError={() => setFailed(true)}
    />
  ) : null;
}
