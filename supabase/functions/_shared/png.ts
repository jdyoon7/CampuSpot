import { PNG } from 'npm:pngjs@7.0.0';
import { Buffer } from 'node:buffer';

const maxImage = 2 * 1024 * 1024;

export async function readImageForm(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return null;
  const parts: BlobPart[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxImage + 32_768) {
      await reader.cancel();
      return null;
    }
    parts.push(new Uint8Array(value));
  }
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data;')) return null;
  return new Response(new Blob(parts), {
    headers: { 'content-type': contentType },
  }).formData();
}

export async function validatedPng(
  image: FormDataEntryValue | null | undefined,
) {
  if (
    !(image instanceof File) ||
    image.type !== 'image/png' ||
    image.size > maxImage
  )
    return null;
  const input = Buffer.from(await image.arrayBuffer());
  if (
    input.length < 33 ||
    input.readUInt32BE(16) > 1200 ||
    input.readUInt32BE(20) > 1200
  )
    return null;
  try {
    const png = PNG.sync.write(PNG.sync.read(input));
    return png.byteLength <= maxImage ? png : null;
  } catch {
    return null;
  }
}
