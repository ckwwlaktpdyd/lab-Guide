import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_ACCOUNTS, signInAsDemo, useSession, type DemoRole } from '@shared/db';

interface Choice {
  role: DemoRole;
  title: string;
  desc: string;
  platform: string;
}

const CHOICES: Choice[] = [
  {
    role: 'client',
    title: '의뢰자 포털',
    desc: '버퍼를 의뢰하고 진행 상황을 확인한 뒤 제조 결과를 리뷰·서명합니다.',
    platform: '웹 · 모바일 반응형',
  },
  {
    role: 'manufacturer',
    title: '제조자 콘솔',
    desc: '의뢰를 수락하고 공정을 기록하며 결과를 1차 검토(서명)합니다.',
    platform: '아이패드 미니 세로 전용',
  },
];

/**
 * 리뷰어 혼선 방지용 스위처(spec §3) 겸 데모 진입점.
 * 역할을 고르면 해당 데모 계정으로 바로 세션을 연다 — 리뷰어는 아무것도 입력하지 않는다.
 */
export function Landing() {
  const navigate = useNavigate();
  const { session, role: currentRole } = useSession();
  const [pending, setPending] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enter = async (role: DemoRole) => {
    setError(null);
    setPending(role);
    try {
      // 다른 역할로 이미 들어와 있으면 갈아탄다.
      if (!session || currentRole !== role) await signInAsDemo(role);
      navigate(DEMO_ACCOUNTS[role].path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPending(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header>
        <div className="mb-6 h-1.5 w-full rounded-sm bg-ph-progress" />
        <h1 className="text-display">
          LAB GUIDE<span className="text-indicator-teal">.</span>
        </h1>
        <p className="mt-2 text-body text-ink-soft">
          버퍼 제조 QC 프로세스 관리. 역할에 따라 두 개의 독립된 화면으로 나뉩니다.
        </p>
      </header>

      <nav className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map((c) => {
          const account = DEMO_ACCOUNTS[c.role];
          const busy = pending === c.role;
          return (
            <button
              key={c.role}
              type="button"
              onClick={() => void enter(c.role)}
              disabled={pending !== null}
              className="cursor-pointer rounded-card border border-line bg-surface p-6 text-left transition-colors duration-150 ease-out hover:border-indicator-teal disabled:cursor-wait disabled:opacity-60"
            >
              <h2 className="text-title">{c.title}</h2>
              <p className="mt-1.5 text-caption text-ink-soft">{c.desc}</p>
              <p className="mt-3 font-mono text-caption text-ink-dim">{c.platform}</p>
              <p className="mt-4 text-caption font-semibold text-indicator-teal">
                {busy ? '들어가는 중…' : `${account.name} (${account.org})으로 둘러보기 →`}
              </p>
            </button>
          );
        })}
      </nav>

      <p className="text-caption text-ink-soft">
        데모 계정으로 바로 입장합니다. 별도 가입이나 로그인 정보 입력이 필요 없습니다.
      </p>

      {error && (
        <p
          role="alert"
          className="whitespace-pre-line rounded-control border border-phenol-pink/45 bg-surface p-4 text-caption text-phenol-pink"
        >
          {error}
        </p>
      )}
    </main>
  );
}
