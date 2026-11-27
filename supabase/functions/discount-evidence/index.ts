import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { PNG } from 'npm:pngjs@7.0.0';
import { Buffer } from 'node:buffer';

const maxImage = 2 * 1024 * 1024;
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
};
const reply = (status: number, code: string) =>
  Response.json({ code }, { status, headers });

async function readForm(req: Request) {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, 'method');
  const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply(401, 'session');
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const options = {
      auth: { autoRefreshToken: false, persistSession: false },
    };
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
    const {
      data: { user },
      error,
    } = await auth.auth.getUser(token);
    if (error || !user?.email_confirmed_at) return reply(401, 'session');

    const form = await readForm(req).catch(() => null);
    const image = form?.get('image');
    if (
      !(image instanceof File) ||
      image.type !== 'image/png' ||
      image.size > maxImage
    )
      return reply(400, 'image');
    const store = form?.get('store_name');
    const details = form?.get('details');
    const source = form?.get('source_url');
    const starts = form?.get('starts_on') ?? null;
    const ends = form?.get('ends_on') ?? null;
    const date = /^\d{4}-\d{2}-\d{2}$/;
    if (
      typeof store !== 'string' ||
      store.trim().length < 1 ||
      store.length > 100 ||
      typeof details !== 'string' ||
      details.trim().length < 1 ||
      details.length > 2000 ||
      typeof source !== 'string' ||
      source.length > 2048 ||
      !/^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?(?:[/?#].*)?$/i.test(source) ||
      /[\s\\]/u.test(source) ||
      !(
        (starts === null && ends === null) ||
        (typeof starts === 'string' &&
          typeof ends === 'string' &&
          date.test(starts) &&
          date.test(ends) &&
          starts <= ends)
      )
    )
      return reply(400, 'invalid');

    const input = Buffer.from(await image.arrayBuffer());
    if (
      input.length < 33 ||
      input.readUInt32BE(16) > 1200 ||
      input.readUInt32BE(20) > 1200
    )
      return reply(400, 'image');
    let png: Buffer;
    try {
      png = PNG.sync.write(PNG.sync.read(input));
    } catch {
      return reply(400, 'image');
    }
    if (png.byteLength > maxImage) return reply(400, 'image');

    const server = createClient(
      url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      options,
    );
    const id = crypto.randomUUID();
    const path = user.id + '/' + id + '.png';
    const bucket = server.storage.from('discount-evidence');
    const upload = await bucket.upload(path, png, {
      contentType: 'image/png',
      cacheControl: '0',
    });
    if (upload.error) return reply(503, 'storage');
    const insert = await server.from('discount_reports').insert({
      id,
      reporter_id: user.id,
      store_name: store.trim(),
      details: details.trim(),
      source_url: source,
      starts_on: starts,
      ends_on: ends,
    });
    if (insert.error) {
      // A network failure may hide a successful insert. Check before cleanup.
      const stored = await server
        .from('discount_reports')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (stored.data) return reply(201, 'saved');
      if (!stored.error) await bucket.remove([path]);
      return reply(
        insert.error.code === '23505' ? 409 : 400,
        insert.error.code === '23505' ? 'duplicate' : 'invalid',
      );
    }
    return reply(201, 'saved');
  } catch {
    return reply(503, 'unavailable');
  }
});
