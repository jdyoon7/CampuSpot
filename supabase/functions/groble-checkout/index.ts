import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { boundedBody, checkoutConfig } from '../_shared/groble.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
};
const reply = (status: number, result: Record<string, unknown>) =>
  Response.json(result, { status, headers });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply(405, { code: 'method' });
  const token = request.headers
    .get('authorization')
    ?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply(401, { code: 'session' });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
    };
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
    const {
      data: { user },
      error,
    } = await auth.auth.getUser(token);
    if (error || !user?.email_confirmed_at)
      return reply(401, { code: 'session' });
    const raw = await boundedBody(request, 2048);
    const data = raw ? JSON.parse(new TextDecoder().decode(raw)) : null;
    if (!data || (data.action !== 'catalog' && data.action !== 'checkout'))
      return reply(400, { code: 'input' });
    const config = checkoutConfig();
    if (!config) return reply(200, { configured: false });
    if (data.action === 'catalog')
      return reply(200, {
        configured: true,
        price: config.price,
        duration: config.duration,
      });
    const business = data.businessId;
    if (
      typeof business !== 'string' ||
      !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(business)
    )
      return reply(400, { code: 'input' });
    const server = createClient(
      url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      options,
    );
    const order = await server.rpc('prepare_groble_ad_order', {
      p_buyer: user.id,
      p_business: business,
      p_product: config.product,
      p_price: config.price,
      p_duration: config.duration,
    });
    if (order.error?.code === '42501') return reply(403, { code: 'forbidden' });
    if (order.error?.code === '55000') return reply(409, { code: 'active' });
    if (order.error || !order.data) return reply(503, { code: 'unavailable' });
    config.url.searchParams.set('ref', 'campuspot-' + order.data);
    return reply(200, { configured: true, checkoutUrl: config.url.href });
  } catch (err) {
    return err instanceof SyntaxError
      ? reply(400, { code: 'input' })
      : reply(503, { code: 'unavailable' });
  }
});
