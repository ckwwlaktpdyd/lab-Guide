import { supabase } from './client';
import type { UserRole } from './constants';

/**
 * 데모 진입 계정.
 *
 * 포트폴리오 리뷰어가 아무 안내 없이 바로 들어와볼 수 있어야 한다.
 * spec의 인증 방식은 매직링크지만, 리뷰어는 데모 계정의 메일함에 접근할 수 없으므로
 * 데모 진입로는 따로 둔다. 실제 사용자 가입 경로는 매직링크 그대로다.
 *
 * 아래 자격증명은 **공개를 전제로 한 값**이다. 빌드 결과물에 그대로 포함되며,
 * 누구나 데모 계정으로 들어올 수 있다 — 데모의 목적이 그것이다.
 * 실사용 계정과 절대 섞지 말 것. 계정 권한은 RLS가 제한한다.
 */
const DEMO_PASSWORD = 'labguide2026';

export const DEMO_ACCOUNTS = {
  client: {
    email: 'client1@labguide.demo',
    name: '김의뢰',
    org: 'QC 2팀',
    path: '/client',
  },
  manufacturer: {
    email: 'maker@labguide.demo',
    name: '최제조',
    org: '제1실습실',
    path: '/console',
  },
} as const satisfies Record<UserRole, { email: string; name: string; org: string; path: string }>;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

/** 랜딩에서 역할을 고르면 그 계정으로 세션을 연다. */
export async function signInAsDemo(role: DemoRole): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role].email,
    password: DEMO_PASSWORD,
  });

  if (error) {
    // AuthError는 message가 비어 있는 경우가 있어 status/name까지 함께 남긴다.
    // 원인을 감추면 "왜 안 되는지 모르겠다"로 끝난다.
    const detail = [error.name, error.status, error.message].filter(Boolean).join(' · ');
    const hint =
      error.status === 400
        ? 'supabase/seed.sql 을 실행했는지 확인하세요.'
        : error.status === 500
          ? 'auth.users 레코드가 깨졌을 수 있습니다. seed.sql을 다시 실행해 보세요.'
          : '';
    throw new Error(`데모 계정 로그인 실패 (${detail})${hint ? `\n${hint}` : ''}`);
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
