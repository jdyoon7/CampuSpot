import { z } from 'zod';

export const businessCategory = z.enum([
  'food',
  'cafe',
  'retail',
  'culture',
  'health',
  'services',
  'other',
]);
export const businessCategoryLabels: Record<
  z.infer<typeof businessCategory>,
  string
> = {
  food: '음식점·식당',
  cafe: '카페·베이커리',
  retail: '쇼핑·소매',
  culture: '문화·여가',
  health: '건강·운동',
  services: '생활 서비스',
  other: '기타',
};
