import assert from 'node:assert/strict';
import {
  InvalidGrobleEvent,
  parseGrobleEvent,
  verifyGroble,
} from './groble.ts';

const timestamp = '1795795200';
const testClock = Number(timestamp) * 1000;
const encoder = new TextEncoder();
async function signature(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(timestamp + '.' + body),
    ),
  );
  return Array.from(mac, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.test(
  'verify raw bytes, previous signing key, expiration and tampering',
  async () => {
    const body = '{ "value":"한글" }',
      raw = encoder.encode(body);
    const signed = await signature('synthetic', body);
    const headers = new Headers({
      'X-Groble-Timestamp': timestamp,
      'X-Groble-Signature': signed,
    });
    assert(await verifyGroble(headers, raw, 'synthetic', undefined, testClock));
    assert.equal(
      await verifyGroble(
        headers,
        encoder.encode(body.trim() + ' '),
        'synthetic',
        undefined,
        testClock,
      ),
      false,
    );
    assert.equal(
      await verifyGroble(
        headers,
        raw,
        'synthetic',
        undefined,
        testClock + 301000,
      ),
      false,
    );
    headers.set('X-Groble-Signature-Previous', signed);
    headers.set('X-Groble-Signature', 'a'.repeat(64));
    assert(await verifyGroble(headers, raw, 'fresh', 'synthetic', testClock));
  },
);

const date = '2026-11-28T11:00:00+09:00';
const order = 'd5a1bb71-5219-4ba5-a147-99203404c7c7';
function event(type = 'payment.completed') {
  return {
    id: 'evt_campus_development_01',
    type,
    occurredAt: date,
    data: {
      object: {
        merchantUid: 'development-payment',
        sellerReference: 'campuspot-' + order,
        content: {
          id: 'promoted-store-07',
          type: 'SERVICE',
          inputMode: 'PAYMENT_WINDOW',
          paymentType: 'ONE_TIME',
        },
        pricing: { currency: 'KRW', finalAmount: 4700 },
        options: [{ quantity: 1, additionalOptions: [] }],
        buyer: { email: 'discard@example.test' },
        payment: { purchasedAt: date },
        refund: { currency: 'KRW', amount: 1500, refundedAt: date },
      },
    },
  };
}

Deno.test('completion keeps only order, payment and price fields', () => {
  const result = parseGrobleEvent(event(), 'delivery-01');
  assert(result && 'p_order' in result);
  assert.equal(result.p_order, order);
  assert.equal(result.p_amount, 4700);
  assert.equal(JSON.stringify(result).includes('discard'), false);
  const wrong = event();
  wrong.data.object.options[0].quantity = 2;
  assert.throws(
    () => parseGrobleEvent(wrong, 'delivery-01'),
    InvalidGrobleEvent,
  );
});

Deno.test('refunds use merchant ID without a seller reference', () => {
  const data = event('payment.refunded');
  data.data.object.sellerReference = '';
  const result = parseGrobleEvent(data, 'delivery-02');
  assert(result && 'p_refund_amount' in result);
  assert.equal(result.p_refund_amount, 1500);
  assert.equal(result.p_merchant, 'development-payment');
  data.data.object.refund.amount = 5000;
  assert.throws(
    () => parseGrobleEvent(data, 'delivery-02'),
    InvalidGrobleEvent,
  );
});

Deno.test(
  'dashboard test delivery and unrelated references cannot activate ads',
  () => {
    const data = event();
    data.id = 'evt_test_sample';
    assert.equal(parseGrobleEvent(data, 'delivery-01'), null);
    const external = event();
    external.data.object.sellerReference = 'external-demo';
    assert.equal(parseGrobleEvent(external, 'delivery-01'), null);
    assert.equal(
      parseGrobleEvent(event('subscription_payment.completed'), 'delivery-01'),
      null,
    );
  },
);
