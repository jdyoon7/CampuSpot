import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
// 미연결을 명확하게 구분합니다. 호출자는 null일 때 연결 안내를 보여야 합니다.
export const supabase = url && key ? createClient(url, key) : null;
