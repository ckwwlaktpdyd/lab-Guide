import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 목업 모드(VITE_MOCK=1)는 Supabase에 붙지 않으므로 키가 없어도 된다.
if ((!url || !anonKey) && import.meta.env.VITE_MOCK !== '1') {
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없습니다. .env.example을 참고해 .env.local을 만드세요.',
  );
}

/**
 * 두 앱이 같은 Supabase 프로젝트를 공유한다. 별도 API 서버는 없다.
 * 접근 제어는 앱 코드가 아니라 RLS가 한다 — supabase/migrations/0002_rls.sql
 */
export const supabase = createClient<Database>(url || 'https://mock.invalid', anonKey || 'mock');
