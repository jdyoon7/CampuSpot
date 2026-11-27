import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { readImageForm, validatedPng } from '../_shared/png.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Cache-Control': 'no-store',
};
const response = (status: number, code: string) =>
  Response.json({ code }, { status, headers });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return response(405, 'method');
  const token = req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return response(401, 'session');

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
    if (error || !user?.email_confirmed_at) return response(401, 'session');
    const form = await readImageForm(req).catch(() => null);
    const id = form?.get('business');
    const action = form?.get('action');
    if (
      typeof id !== 'string' ||
      !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id) ||
      (action !== 'save' && action !== 'remove')
    )
      return response(400, 'invalid');

    const server = createClient(
      url,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      options,
    );
    const owner = await server
      .from('business_operator_requests')
      .select('id')
      .eq('business_id', id)
      .eq('requested_by', user.id)
      .eq('status', 'approved')
      .maybeSingle();
    if (owner.error) return response(503, 'unavailable');
    if (!owner.data) return response(403, 'forbidden');

    const loadPhoto = () =>
      server.from('businesses').select('photo_path').eq('id', id).single();
    const business = await loadPhoto();
    if (business.error) return response(503, 'unavailable');
    const previous = business.data.photo_path as string | null;
    const bucket = server.storage.from('business-photos');
    let path: string | null = null;
    if (action === 'save') {
      const png = await validatedPng(form?.get('image'));
      if (!png) return response(400, 'image');
      path = id + '/' + crypto.randomUUID() + '.png';
      const upload = await bucket.upload(path, png, {
        contentType: 'image/png',
        cacheControl: '0',
      });
      if (upload.error) return response(503, 'storage');
    }

    const update = await server.rpc('manage_discount_business_photo', {
      p_actor: user.id,
      p_business: id,
      p_expected: previous,
      p_path: path,
    });
    if (update.error || !update.data) {
      const current = await loadPhoto();
      if (current.error || current.data.photo_path !== path || !update.error) {
        if (path && !current.error && current.data.photo_path !== path)
          await bucket.remove([path]);
        if (update.error?.code === '42501') return response(403, 'forbidden');
        return response(
          update.error ? 503 : 409,
          update.error ? 'storage' : 'conflict',
        );
      }
    }
    if (previous && previous !== path) await bucket.remove([previous]);
    return response(200, action === 'save' ? 'saved' : 'removed');
  } catch {
    return response(503, 'unavailable');
  }
});
