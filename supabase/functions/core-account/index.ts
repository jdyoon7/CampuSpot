import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { PNG } from 'npm:pngjs@7.0.0';
import { Buffer } from 'node:buffer';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
};
const reply = (status: number, code: string) =>
  Response.json({ code }, { status, headers });
const limit = 2 * 1024 * 1024;
async function boundedBody(req: Request, max: number) {
  const reader = req.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(parts);
    bytes += value.length;
    if (bytes > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
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
    if (error || !user?.email_confirmed_at || !user.email)
      return reply(401, 'session');
    const server = createClient(
      url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      options,
    );
    const bucket = server.storage.from('core-avatars');
    const path = user.id + '/avatar.png';
    if (req.headers.get('content-type') === 'image/png') {
      const body = await boundedBody(req, limit);
      if (
        !body ||
        body.length < 33 ||
        body.readUInt32BE(16) > 1024 ||
        body.readUInt32BE(20) > 1024
      )
        return reply(400, 'image');
      let png;
      try {
        png = PNG.sync.write(PNG.sync.read(body));
      } catch {
        return reply(400, 'image');
      }
      if (png.byteLength > limit) return reply(400, 'image');
      const { error } = await bucket.upload(path, png, {
        upsert: true,
        contentType: 'image/png',
        cacheControl: '0',
      });
      if (error) return reply(503, 'storage');
      const owner = await server.auth.admin.getUserById(user.id);
      if (!owner.data.user && owner.error?.status === 404) {
        await bucket.remove([path]);
        return reply(401, 'session');
      }
      return reply(200, 'saved');
    }
    const raw = await boundedBody(req, 4096);
    if (!raw) return reply(400, 'input');
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      return reply(400, 'input');
    }
    if (data?.action === 'delete') {
      if (typeof data.password !== 'string' || !data.password)
        return reply(400, 'password');
      const proof = await auth.auth.signInWithPassword({
        email: user.email,
        password: data.password,
      });
      if (proof.error || proof.data.user?.id !== user.id)
        return reply(403, 'password');
      if ((await bucket.remove([path])).error) return reply(503, 'storage');
      if ((await server.auth.admin.deleteUser(user.id)).error)
        return reply(503, 'delete_failed');
      return reply(200, 'deleted');
    }
    if (data?.action !== 'school-email' || typeof data.email !== 'string')
      return reply(400, 'input');
    const from = Deno.env.get('SCHOOL_MAIL_FROM'),
      key = Deno.env.get('RESEND_API_KEY');
    if (!from || !key) return reply(503, 'mail_unconfigured');
    const email = data.email.trim().toLowerCase(),
      code = crypto.randomUUID();
    const digest = Buffer.from(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)),
    ).toString('hex');
    const issue = await server.rpc('issue_school_challenge', {
      p_user: user.id,
      p_email: email,
      p_digest: '\\x' + digest,
    });
    if (issue.error) return reply(503, 'db');
    if (issue.data !== 'issued')
      return reply(issue.data === 'rate_limited' ? 429 : 400, issue.data);
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'CampuSpot 학교 이메일 인증',
        text: '10분 안에 마이페이지에 이 코드를 입력하세요.\n' + code,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return sent.ok ? reply(200, 'sent') : reply(503, 'mail_failed');
  } catch {
    return reply(503, 'unavailable');
  }
});
