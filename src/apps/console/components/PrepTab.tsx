import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { Button, DataValue } from '@shared/ui';
import {
  CALIBRATION_VALID_HOURS,
  confirmLot,
  confirmSop,
  fetchBatchPrep,
  recordCalibration,
  selectBatchReagent,
  startProcess,
  type BatchPrep,
  type PrepInstrument,
  type PrepReagent,
  type CalibrationKind,
} from '@shared/db';

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function since(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.round(m / 60)}시간 전`;
  return `${Math.round(m / 1440)}일 전`;
}

/**
 * ① 계측기 판정.
 * 저울 0점은 이 배치 생성 이후에 찍혀야 한다. pH미터 교정은 24시간 이내면 된다 —
 * 민감한 기기라 재교정이 필요할 때가 있지만 매 배치는 아니다(현장 문답 09-17).
 * 전도도계는 결과 단계에서 쓰므로 준비에선 안내만 한다.
 */
function instrumentState(i: PrepInstrument, batchCreatedAt: string) {
  const isZero = i.id === 'BAL-204';
  const needKind: CalibrationKind = isZero ? 'zero' : 'calibration';
  const last = i.last?.kind === needKind ? i.last : null;
  const required = i.id !== 'COND-500';
  let ok: boolean;
  let reason: string | null = null;
  if (!last) {
    ok = false;
    reason = isZero ? '이 배치의 0점 기록 없음' : '교정 기록 없음';
  } else if (isZero) {
    ok = last.performed_at >= batchCreatedAt;
    if (!ok) reason = '배치 생성 전 기록 — 다시 0점';
  } else {
    const hrs = (Date.now() - new Date(last.performed_at).getTime()) / 3600000;
    ok = hrs <= CALIBRATION_VALID_HOURS;
    if (!ok) reason = `${CALIBRATION_VALID_HOURS}시간 경과 — 재교정 필요`;
  }
  return { needKind, last, ok: required ? ok : true, required, reason };
}

const today = () => new Date().toISOString().slice(0, 10);
const expired = (lot: PrepReagent['lots'][number]) => lot.expires_on < today();

export function PrepTab({ batchId, onStarted }: { batchId: string; onStarted: () => void }) {
  const [prep, setPrep] = useState<BatchPrep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const reload = useCallback(() => {
    fetchBatchPrep(batchId)
      .then(setPrep)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [batchId]);
  useEffect(reload, [reload]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !prep)
    return (
      <p role="alert" className="text-caption text-phenol-pink">
        {error}
      </p>
    );
  if (!prep) return <p className="text-caption text-ink-dim">불러오는 중…</p>;

  const b = prep.batch;
  const inst = prep.instruments.map((i) => ({ i, s: instrumentState(i, b.created_at) }));
  const weighed = prep.reagents.filter((r) => r.reagent.kind === 'weighed');

  const done = [
    inst.every((x) => x.s.ok),
    b.sop_confirmed_at !== null,
    weighed.every((r) => r.chosen && !expired(r.lots.find((l) => l.id === r.chosen!.reagent_lot_id)!)),
    b.lot_confirmed_at !== null,
  ];
  const doneCount = done.filter(Boolean).length;
  // 현재 단계만 펼친다 — 744pt 안에 들어가야 한다. 사용자가 다른 단계를 열면 그걸 따른다.
  const current = open ?? done.findIndex((d) => !d);
  const allDone = doneCount === 4;
  const started = b.prep_completed_at !== null;

  const rows: { title: string; summary: string; body: React.ReactNode }[] = [
    {
      title: '계측기 0점 · 교정',
      summary: inst.filter((x) => x.s.required).map((x) => `${x.i.id} ${x.s.ok ? '✓' : '·'}`).join('  '),
      body: (
        <ul className="flex flex-col gap-2">
          {inst.map(({ i, s }) => (
            <li
              key={i.id}
              className={`flex items-center gap-3 rounded-control border px-3 py-2 ${
                s.ok ? 'border-line bg-surface' : 'border-phenol-pink/40 bg-phenol-pink/[.04]'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DataValue emphasis>{i.id}</DataValue>
                  <span className="text-caption text-ink-soft">{i.kind}</span>
                  {!s.required && <span className="text-caption text-ink-dim">· 결과 단계에서 사용</span>}
                </div>
                <p className="mt-0.5 font-mono text-caption text-ink-soft">
                  {s.last
                    ? `마지막 ${s.needKind === 'zero' ? '0점' : '교정'} ${since(s.last.performed_at)} · ${dt.format(new Date(s.last.performed_at))} · ${s.last.performed_by.name}`
                    : '기록 없음'}
                  {s.reason && <span className="ml-2 font-semibold text-phenol-pink">{s.reason}</span>}
                </p>
              </div>
              {s.required && (
                <Button
                  variant={s.ok ? 'ghost' : 'primary'}
                  touch
                  disabled={busy || started}
                  onClick={() => void run(() => recordCalibration(i.id, s.needKind))}
                >
                  {s.needKind === 'zero' ? '0점 확인' : '교정 기록'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: 'SOP 확인',
      summary: b.sop_confirmed_at
        ? `확인 ${dt.format(new Date(b.sop_confirmed_at))}`
        : `레시피 ${prep.steps.length}단계 · 주의사항 ${prep.steps.filter((s) => s.note).length}`,
      body: (
        <>
          <ol className="flex flex-col gap-1.5">
            {prep.steps.map((s) => (
              <li key={s.seq} className="text-body">
                <span className="font-mono text-caption text-ink-soft">{s.seq}.</span> {s.name}
                {s.note && (
                  <p className="ml-5 flex items-start gap-1 text-caption text-ink-soft">
                    <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-indicator-amber" />
                    {s.note}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-3">
            <Button
              variant={b.sop_confirmed_at ? 'ghost' : 'primary'}
              touch
              disabled={busy || started || b.sop_confirmed_at !== null}
              onClick={() => void run(() => confirmSop(b.id))}
            >
              {b.sop_confirmed_at ? <><Check aria-hidden className="size-4" /> 확인함</> : 'SOP를 확인했습니다'}
            </Button>
          </div>
        </>
      ),
    },
    {
      title: '시약 준비 — 로트 선택',
      summary: `칭량 시약 ${weighed.length} · 선택 ${weighed.filter((r) => r.chosen).length}`,
      body: (
        <ul className="flex flex-col gap-2">
          {prep.reagents.map((r) => {
            const chosenLot = r.chosen ? r.lots.find((l) => l.id === r.chosen!.reagent_lot_id) : null;
            const bad = chosenLot ? expired(chosenLot) : false;
            const titrated = r.reagent.kind === 'titrated';
            return (
              <li
                key={r.reagent.id}
                className={`flex items-center gap-3 rounded-control border px-3 py-2 ${
                  bad ? 'border-phenol-pink/40 bg-phenol-pink/[.04]' : 'border-line bg-surface'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-semibold">{r.reagent.name}</span>
                    <span className="font-mono text-caption text-ink-soft">
                      {titrated ? '적정 — 목표 pH까지' : `${r.reagent.amount} ${r.reagent.unit}`}
                    </span>
                  </div>
                  {chosenLot && (
                    <p className={`mt-0.5 font-mono text-caption ${bad ? 'font-semibold text-phenol-pink' : 'text-ink-soft'}`}>
                      {bad ? `만료 — 유효 ${chosenLot.expires_on}` : `유효 ${chosenLot.expires_on} ✓`}
                    </p>
                  )}
                </div>
                {titrated ? (
                  <span className="text-caption text-ink-dim">로트 선택 불필요</span>
                ) : (
                  <label className="relative">
                    <span className="sr-only">{r.reagent.name} 로트</span>
                    <select
                      value={r.chosen?.reagent_lot_id ?? ''}
                      disabled={busy || started}
                      onChange={(e) => void run(() => selectBatchReagent(b.id, r.reagent.id, e.target.value))}
                      className={`min-h-touch appearance-none rounded-control border bg-surface py-2 pl-3 pr-9 font-mono text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indicator-teal/40 ${
                        bad ? 'border-phenol-pink/45 text-phenol-pink' : chosenLot ? 'border-indicator-teal/40 text-indicator-teal' : 'border-line'
                      }`}
                    >
                      <option value="" disabled>
                        로트 선택
                      </option>
                      {r.lots.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.lot_number}
                          {expired(l) ? ' — 만료' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      ),
    },
    {
      title: '제조 LOT 확인',
      summary: b.lot_confirmed_at ? `확인 ${dt.format(new Date(b.lot_confirmed_at))}` : b.lot_number,
      body: (
        <div className="flex items-center gap-4">
          <div className="flex-1 rounded-control border border-line bg-surface px-4 py-3">
            <DataValue emphasis className="text-[26px]">
              {b.lot_number}
            </DataValue>
            <p className="mt-1 text-caption text-ink-soft">
              이 번호가 의뢰자의 실험 서류에 동기화됩니다. 제조된 시약에 붙는 추적 번호입니다.
            </p>
          </div>
          <Button
            variant={b.lot_confirmed_at ? 'ghost' : 'primary'}
            touch
            disabled={busy || started || b.lot_confirmed_at !== null}
            onClick={() => void run(() => confirmLot(b.id))}
          >
            {b.lot_confirmed_at ? <><Check aria-hidden className="size-4" /> 확인함</> : 'LOT 확인'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <ol className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {rows.map((r, i) => {
          const isOpen = current === i;
          return (
            <li key={r.title} className={`rounded-card border bg-surface ${isOpen ? 'border-[1.5px] border-indicator-teal shadow-ring' : 'border-line'}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex min-h-touch w-full cursor-pointer items-center gap-3 px-4 text-left"
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] text-white ${
                    done[i] ? 'bg-indicator-green' : isOpen ? 'bg-indicator-teal' : 'border-[1.5px] border-line bg-surface'
                  }`}
                >
                  {done[i] ? <Check aria-hidden className="size-3" /> : null}
                </span>
                <span className={`text-body ${done[i] && !isOpen ? 'text-ink-soft' : 'font-bold'}`}>
                  {i + 1}. {r.title}
                </span>
                <span className="ml-auto font-mono text-caption text-ink-soft">{r.summary}</span>
              </button>
              {isOpen && <div className="border-t border-bench px-4 py-3">{r.body}</div>}
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="mt-2 text-caption text-phenol-pink">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-4 border-t border-line pt-3">
        <span className="font-mono text-caption text-ink-soft">준비 {doneCount}/4</span>
        {started ? (
          <span className="text-caption font-semibold text-indicator-green">공정 시작됨 · {dt.format(new Date(b.prep_completed_at!))}</span>
        ) : (
          <Button
            variant="sign"
            touch
            disabled={!allDone || busy}
            title={allDone ? undefined : '4단계를 모두 마쳐야 시작할 수 있습니다'}
            onClick={() => void run(async () => { await startProcess(b.id); onStarted(); })}
          >
            공정 시작
          </Button>
        )}
      </div>
    </div>
  );
}
