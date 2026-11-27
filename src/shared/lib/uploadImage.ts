import { AccountError } from '../auth/account';

const limit = 2 * 1024 * 1024;
export const invalidImage = () =>
  new AccountError(
    'image',
    'JPG 또는 PNG 사진을 확인해 주세요. 사진 크기는 최대 2MB입니다.',
  );

export async function prepareImage(file: File) {
  if (
    !['image/jpeg', 'image/png'].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw invalidImage();
  const source = await createImageBitmap(file).catch(() => {
    throw invalidImage();
  });
  try {
    const scale = Math.min(1, 1200 / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw invalidImage();
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!image || image.size > limit) throw invalidImage();
    return image;
  } finally {
    source.close();
  }
}
