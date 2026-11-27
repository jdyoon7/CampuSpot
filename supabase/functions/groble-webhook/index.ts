import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import {
  boundedBody,
  InvalidGrobleEvent,
  parseGrobleEvent,
  verifyGroble,
} from '../_shared/groble.ts';

const reply = (status: number, result: string) =>
  Response.json(
    { result },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply(405, 'method');
  const secret = Deno.env.get('GROBLE_WEBHOOK_SECRET');
  if (!secret) return reply(503, 'unconfigured');
  try {
    const body = await boundedBody(request, 256 * 1024);
    if (!body) return reply(400, 'body');
    if (
      !(await verifyGroble(
        request.headers,
        body,
        secret,
        Deno.env.get('GROBLE_WEBHOOK_SECRET_PREVIOUS'),
      ))
    )
      return reply(401, 'signature');
    const event = parseGrobleEvent(
      JSON.parse(new TextDecoder().decode(body)),
      request.headers.get('x-groble-idempotency-key'),
    );
    if (!event) return reply(200, 'ignored');
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { error } = await db.rpc('record_groble_ad_event', event);
    return error ? reply(503, 'retry') : reply(200, 'accepted');
  } catch (err) {
    return err instanceof InvalidGrobleEvent || err instanceof SyntaxError
      ? reply(400, 'payload')
      : reply(503, 'retry');
  }
});
