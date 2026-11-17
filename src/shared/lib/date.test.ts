import { expect, test } from 'vitest';
import { formatKoreanDate } from './date';
test('UTC 자정 직전 날짜를 한국 시간의 다음 날로 표시한다', () => {
  expect(formatKoreanDate('2026-01-01T23:00:00Z')).toContain('2026. 1. 2.');
});
