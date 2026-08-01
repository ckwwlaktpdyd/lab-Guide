import { RotateGuard } from '@shared/ui';

/** 제조자 콘솔 — 마일스톤 ③④에서 레일·리스트·상세 스플릿뷰를 채운다. */
export function ConsoleApp() {
  return (
    <div className="min-h-dvh bg-bench">
      <RotateGuard />
      <p className="p-6 text-body text-ink-soft">제조자 콘솔 — 마일스톤 ③④</p>
    </div>
  );
}
