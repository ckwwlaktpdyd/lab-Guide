import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * 제조자 콘솔은 아이패드 미니 세로 전용이다.
 * 웹이라 기기 회전을 막을 수 없으므로 가로 감지 시 안내 오버레이만 띄운다.
 * 가로용 레이아웃을 만들지 않는다(CLAUDE.md).
 * 데스크톱 브라우저(넓은 가로)에서 개발할 때도 뜨므로, 폭이 세로 기준보다 넓을 때만 판정한다.
 */
export function RotateGuard() {
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-width: 1200px)');
    const sync = () => setLandscape(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (!landscape) return null;

  return (
    <div
      role="alertdialog"
      aria-label="화면 방향 안내"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink px-8 text-center text-white"
    >
      <RotateCcw aria-hidden className="size-12" />
      <p className="text-title font-bold">세로 모드로 돌려주세요</p>
      <p className="text-body text-white/70">
        제조자 콘솔은 아이패드 세로 화면에 맞춰 설계되었습니다.
      </p>
    </div>
  );
}
