import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './client';
import type { UserRole } from './constants';

interface SessionState {
  session: Session | null;
  /** RLS가 읽는 것과 같은 출처 — JWT의 app_metadata.role */
  role: UserRole | null;
  loading: boolean;
}

/**
 * 역할은 profiles가 아니라 JWT에서 읽는다.
 * RLS 정책(auth_role())과 같은 값을 보게 하려는 것이다 — 화면이 보여주는 권한과
 * DB가 실제로 허용하는 권한이 어긋나지 않는다.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;

    const apply = (session: Session | null) => {
      if (!alive) return;
      const role = (session?.user.app_metadata as { role?: UserRole } | undefined)?.role ?? null;
      setState({ session, role, loading: false });
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
