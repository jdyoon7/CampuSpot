const encoder = new TextEncoder();
const supportedEvents = new Set([
  'payment.completed',
  'payment.cancel_requested',
  'payment.refunded',
]);

export function checkoutConfig() {
  if (
    Deno.env.get('GROBLE_ENABLE_CHECKOUT') !== 'true' ||
    !Deno.env.get('GROBLE_WEBHOOK_SECRET')
  )
    return null;
  const product = Deno.env.get('GROBLE_PRODUCT_ID')?.trim() ?? '';
  const price = Number(Deno.env.get('GROBLE_AMOUNT_KRW'));
  const duration = Number(Deno.env.get('GROBLE_AD_DURATION_HOURS'));
  try {
    const url = new URL(Deno.env.get('GROBLE_CHECKOUT_URL') ?? '');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !['groble.im', 'www.groble.im'].includes(url.hostname)
    )
      return null;
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(product) ||
      !Number.isSafeInteger(price) ||
      price < 1 ||
      price > 100000000 ||
      !Number.isSafeInteger(duration) ||
      duration < 1 ||
      duration > 720
    )
      return null;
    return { product, price, duration, url };
  } catch {
    return null;
  }
}

export async function boundedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function matches(
  secret: string,
  signature: string,
  message: Uint8Array<ArrayBuffer>,
) {
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/.{2}/g)!, (pair) =>
    parseInt(pair, 16),
  );
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, bytes, message);
}

export async function verifyGroble(
  headers: Headers,
  body: Uint8Array,
  secret: string,
  previous: string | undefined,
  now = Date.now(),
) {
  const signature = headers.get('x-groble-signature');
  const timestamp = headers.get('x-groble-timestamp');
  if (
    !signature ||
    !timestamp ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const prefix = encoder.encode(timestamp + '.');
  const payload = new Uint8Array(prefix.length + body.length);
  payload.set(prefix);
  payload.set(body, prefix.length);
  if (await matches(secret, signature, payload)) return true;
  const old = headers.get('x-groble-signature-previous');
  return previous && old ? matches(previous, old, payload) : false;
}

export class InvalidGrobleEvent extends Error {}
const record = (value: unknown) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function date(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T[0-9:.]+(?:[+-]\d{2}:\d{2}|Z)$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new InvalidGrobleEvent();
  return value;
}
function key(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:=~-]{1,160}$/.test(value))
    throw new InvalidGrobleEvent();
  return value;
}
function krw(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 100000000
  )
    throw new InvalidGrobleEvent();
  return value;
}
export function parseGrobleEvent(input: unknown, delivery: string | null) {
  const envelope = record(input);
  if (typeof envelope.type !== 'string') throw new InvalidGrobleEvent();
  if (!supportedEvents.has(envelope.type)) return null;
  const event = key(envelope.id);
  const object = record(record(envelope.data).object);
  const merchant = key(object.merchantUid);
  // The dashboard test delivery uses fixture identifiers and must never activate an ad.
  if (event.startsWith('evt_test_') || merchant.startsWith('test_'))
    return null;
  const content = record(object.content);
  const pricing = record(object.pricing);
  if (
    content.type !== 'SERVICE' ||
    content.paymentType !== 'ONE_TIME' ||
    content.inputMode !== 'PAYMENT_WINDOW'
  )
    return null;
  if (pricing.currency !== 'KRW') throw new InvalidGrobleEvent();
  const amount = krw(pricing.finalAmount);
  const eventAt = date(envelope.occurredAt);
  const base = {
    p_event: event,
    p_delivery: key(delivery),
    p_kind: envelope.type,
    p_merchant: merchant,
    p_product: key(content.id),
    p_amount: amount,
    p_occurred_at: eventAt,
  };
  if (envelope.type === 'payment.completed') {
    const ref = object.sellerReference;
    if (
      typeof ref !== 'string' ||
      !/^campuspot-[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(ref)
    )
      return null;
    const options = object.options;
    if (
      !Array.isArray(options) ||
      options.length !== 1 ||
      record(options[0]).quantity !== 1 ||
      (Array.isArray(record(options[0]).additionalOptions) &&
        (record(options[0]).additionalOptions as unknown[]).length > 0)
    )
      throw new InvalidGrobleEvent();
    return {
      ...base,
      p_order: ref.slice('campuspot-'.length),
      p_paid_at: date(record(object.payment).purchasedAt),
    };
  }
  if (envelope.type !== 'payment.refunded') return base;
  const refund = record(object.refund);
  const refundAmount = krw(refund.amount);
  if (refund.currency !== 'KRW' || refundAmount > amount)
    throw new InvalidGrobleEvent();
  return {
    ...base,
    p_refund_at: date(refund.refundedAt),
    p_refund_amount: refundAmount,
  };
}
