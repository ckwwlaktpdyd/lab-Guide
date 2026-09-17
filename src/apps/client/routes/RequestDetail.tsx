import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Lock, MessageCircleQuestion } from 'lucide-react';
import { Button, Card, DataValue, GradientStepper, PromptDialog, StatusBadge } from '@shared/ui';
import {
  CLIENT_STAGE_LABEL,
  CLIENT_STEPS,
  INQUIRY_DECISION_LABEL,
  addComment,
  answerInquiry,
  clientStage,
  fetchRequestDetail,
  stageIndex,
  type RequestDetailData,
} from '@shared/db';
import { ReviewDialog } from '../components/ReviewDialog';

const mdt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * 의뢰 상세 — 공정·편차·결과를 한 페이지로.
 * 좌측 타임라인이 스크롤 축, 우측은 스티키. 결과·리뷰 액션은 모달(docs/feedback-0914.md §2).
 * 모바일에서는 스티키 패널이 하단 CTA 바가 된다.
 */
export function RequestDetail() {
  const { id = '' } = useParams();
  const [data, setData] = useState<RequestDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const reload = useCallback(() => {
    fetchRequestDetail(id)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useEffect(reload, [reload]);

  if (error)
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p role="alert" className="text-caption text-phenol-pink">
          {error}
        </p>
      </main>
    );
  if (!data)
    return <main className="mx-auto max-w-6xl px-4 py-10 text-caption text-ink-dim">불러오는 중…</main>;

  const r = data;
  const input = {
    status: r.status,
    result: r.batch?.result ?? null,
    batchDone: r.batch?.status === 'completed',
    openInquiry: r.batch?.inquiries.some((q) => q.decision === null) ?? false,
  };
  const stage = clientStage(input);
  const target = r.recipe.target_params;

  /** 검토 버튼 3분기 — 검토 전 / 리뷰 필요 / 완료 */
  const review =
    stage === 'review'
      ? { enabled: true, label: '제조 결과 확인 · 서명', hint: '제조가 완료되었습니다. 결과를 확인하고 서명해 주세요.' }
      : stage === 'done'
        ? { enabled: true, label: '제조 결과 보기', hint: '리뷰가 완료된 의뢰입니다.' }
        : { enabled: false, label: '제조 결과 확인', hint: '아직 검토 단계가 아닙니다.' };

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-10 sm:pt-8">
        <Link
          to={stage === 'done' ? '/client/done' : '/client'}
          className="inline-flex items-center gap-1 text-caption text-ink-soft hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" /> 내 의뢰
        </Link>

        <header className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-display">{r.recipe.name}</h1>
          <DataValue className="text-body text-ink-soft">{r.code}</DataValue>
          <StatusBadge
            tone={stage === 'done' ? 'done' : stage === 'pending' ? 'wait' : 'running'}
          >
            {r.status === 'rejected' ? '반려' : CLIENT_STAGE_LABEL[stage]}
          </StatusBadge>
          {r.request_type === 'remake' && <StatusBadge tone="remake">재제조</StatusBadge>}
        </header>

        {/* 리뷰 필요일 때만 히어로. 아닌 사용자에게 빈 영역을 보여주지 않는다. */}
        {stage === 'review' && (
          <div className="mt-5 rounded-card border border-indicator-teal/25 bg-indicator-teal/[.05] px-5 py-4">
            <p className="text-title">제조가 완료되었습니다 — 리뷰를 진행해 주세요</p>
            <p className="mt-1 text-caption text-ink-soft">
              {r.batch && (
                <>
                  <DataValue>{r.batch.lot_number}</DataValue> ·{' '}
                </>
              )}
              제조자 1차 검토 완료
              {r.batch?.result?.manufacturer_signed_by && ` (${r.batch.result.manufacturer_signed_by.name}`}
              {r.batch?.result?.manufacturer_signed_at &&
                `, ${mdt.format(new Date(r.batch.result.manufacturer_signed_at))})`}
            </p>
          </div>
        )}

        {input.openInquiry && (
          <div className="mt-5 rounded-card border border-indicator-amber/50 bg-badge-amber-bg px-5 py-4">
            <p className="flex items-center gap-2 text-title text-badge-amber-fg">
              <MessageCircleQuestion aria-hidden className="size-5" /> 제조자가 확인을 요청했습니다
            </p>
            <p className="mt-1 text-caption text-ink-soft">답을 줄 때까지 공정이 멈춰 있습니다. 아래 타임라인에서 답해주세요.</p>
          </div>
        )}

        {r.status === 'rejected' && (
          <div className="mt-5 rounded-card border border-phenol-pink/35 bg-phenol-pink/[.04] px-5 py-4">
            <p className="text-title text-phenol-pink">반려되었습니다</p>
            <p className="mt-1 text-body text-ink-soft">{r.rejection_reason}</p>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          {/* 좌측 — 스크롤 축 */}
          <div>
            <Timeline data={r} onChanged={reload} />
            <Comments data={r} onPosted={reload} />
          </div>

          {/* 우측 — 스티키. 모바일에서는 숨기고 하단 CTA로 대체 */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-4">
              <Card className="p-5">
                <h2 className="text-caption font-semibold text-ink-soft">요청 정보</h2>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-caption">
                  <dt className="text-ink-soft">레시피</dt>
                  <dd>{r.recipe.name}</dd>
                  {target.ph !== undefined && (
                    <>
                      <dt className="text-ink-soft">목표 pH</dt>
                      <dd>
                        {target.ph.toFixed(2)}
                        {target.ph_tolerance !== undefined && ` ±${target.ph_tolerance}`}
                      </dd>
                    </>
                  )}
                  <dt className="text-ink-soft">부피</dt>
                  <dd>{r.volume_ml} mL</dd>
                  <dt className="text-ink-soft">희망 완료</dt>
                  <dd>{mdt.format(new Date(r.desired_completion_at))}</dd>
                  {r.parent && (
                    <>
                      <dt className="text-ink-soft">원본</dt>
                      <dd>{r.parent.code}</dd>
                    </>
                  )}
                </dl>
                <div className="mt-4">
                  <GradientStepper steps={CLIENT_STEPS} current={stageIndex(input)} showLabels />
                </div>
              </Card>

              <Card className={`p-5 ${review.enabled && stage === 'review' ? 'border-[1.5px] border-indicator-teal shadow-ring' : ''}`}>
                <p className={`text-caption ${review.enabled ? 'text-ink-soft' : 'text-ink-dim'}`}>
                  {review.hint}
                </p>
                <Button
                  variant={stage === 'review' ? 'sign' : 'primary'}
                  disabled={!review.enabled}
                  onClick={() => setReviewOpen(true)}
                  className="mt-3 w-full"
                >
                  {!review.enabled && <Lock aria-hidden className="size-4" />}
                  {review.label}
                </Button>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      {/* 모바일 — 하단 고정 CTA. 쿠팡·무신사의 구매하기 바 패턴 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface px-4 py-3 lg:hidden">
        <p className={`mb-2 text-caption ${review.enabled ? 'text-ink-soft' : 'text-ink-dim'}`}>
          {review.hint}
        </p>
        <Button
          variant={stage === 'review' ? 'sign' : 'primary'}
          disabled={!review.enabled}
          onClick={() => setReviewOpen(true)}
          touch
          className="w-full"
        >
          {!review.enabled && <Lock aria-hidden className="size-4" />}
          {review.label}
        </Button>
      </div>

      <ReviewDialog
        open={reviewOpen}
        data={r}
        readOnly={stage === 'done'}
        onClose={() => setReviewOpen(false)}
        onChanged={() => {
          setReviewOpen(false);
          reload();
        }}
      />
    </>
  );
}

// ─── 타임라인 ──────────────────────────────────────────────────

type Inq = NonNullable<RequestDetailData['batch']>['inquiries'][number];

interface Item {
  key: string;
  title: string;
  sub?: string;
  state: 'first' | 'done' | 'now' | 'dim';
  deviations?: NonNullable<RequestDetailData['batch']>['process_steps'][number]['deviations'];
  inquiries?: Inq[];
}

function Timeline({ data: r, onChanged }: { data: RequestDetailData; onChanged: () => void }) {
  const b = r.batch;
  const items: Item[] = [
    { key: 'req', title: '의뢰 접수', sub: mdt.format(new Date(r.created_at)), state: 'first' },
  ];

  if (r.status === 'rejected') {
    items.push({ key: 'rej', title: '반려', sub: r.rejection_reason ?? undefined, state: 'now' });
    return <TimelineView items={items} onChanged={onChanged} />;
  }

  if (!b) {
    items.push({ key: 'acc', title: '제조자 수락 대기', state: 'now' });
    items.push({ key: 'proc', title: '공정', state: 'dim' });
    items.push({ key: 'rev', title: '검토', state: 'dim' });
    items.push({ key: 'end', title: '완료', state: 'dim' });
    return <TimelineView items={items} onChanged={onChanged} />;
  }

  items.push({
    key: 'acc',
    title: '제조자 수락 · 배치 생성',
    sub: `${mdt.format(new Date(b.created_at))} · ${b.lot_number}`,
    state: 'done',
  });

  // 공정 단계는 각각 항목으로. 편차는 해당 단계에 인라인으로 붙는다.
  for (const s of b.process_steps) {
    const st = s.status === 'done' ? 'done' : s.status === 'todo' ? 'dim' : 'now';
    items.push({
      key: s.id,
      title: `${s.seq}. ${s.recipe_steps.name}`,
      sub: s.completed_at
        ? mdt.format(new Date(s.completed_at))
        : s.status === 'running'
          ? '진행중'
          : s.status === 'deviation'
            ? '편차 조치 중'
            : undefined,
      state: st,
      deviations: s.deviations,
      inquiries: b.inquiries.filter((q) => q.process_step_id === s.id),
    });
  }

  const result = b.result;
  const summary = b.batch_summaries;
  items.push({
    key: 'sum',
    title: '배치 요약 확정',
    sub: summary?.confirmed_at ? mdt.format(new Date(summary.confirmed_at)) : undefined,
    state: summary?.confirmed_at ? 'done' : b.status === 'completed' ? 'now' : 'dim',
  });
  items.push({
    key: 'msign',
    title: '제조자 1차 검토(서명)',
    sub: result?.manufacturer_signed_at
      ? `${mdt.format(new Date(result.manufacturer_signed_at))}${result.manufacturer_signed_by ? ` · ${result.manufacturer_signed_by.name}` : ''}`
      : undefined,
    state: result?.manufacturer_signed_at ? 'done' : summary?.confirmed_at ? 'now' : 'dim',
  });
  items.push({
    key: 'creview',
    title:
      result?.client_review_status === 'reviewed'
        ? '결과 리뷰(서명) 완료'
        : result?.client_review_status === 'revision_requested'
          ? '보완 요청됨'
          : '의뢰자 결과 리뷰',
    sub:
      result?.client_signed_at
        ? mdt.format(new Date(result.client_signed_at))
        : result?.manufacturer_signed_at
          ? '우측에서 제조 결과를 확인하고 서명해 주세요'
          : undefined,
    state: result?.client_review_status === 'reviewed' ? 'done' : result?.manufacturer_signed_at ? 'now' : 'dim',
  });

  return <TimelineView items={items} onChanged={onChanged} />;
}

function TimelineView({ items, onChanged }: { items: Item[]; onChanged: () => void }) {
  const lastDone = items.reduce((acc, it, i) => (it.state !== 'dim' ? i : acc), 0);
  const donePct = items.length > 1 ? (lastDone / (items.length - 1)) * 100 : 0;

  return (
    <section aria-label="진행 상황" className="relative pl-7">
      {/* 축 — 진행분은 그라디언트, 나머지는 line */}
      <div aria-hidden className="absolute left-[9px] top-2 bottom-2 w-0.5 rounded-sm bg-line">
        <div className="w-full rounded-sm bg-ph-progress-y" style={{ height: `${donePct}%` }} />
      </div>

      <ol className="flex flex-col gap-5">
        {items.map((it) => (
          <li key={it.key} className="relative">
            <span
              aria-hidden
              className={`absolute -left-7 top-1 size-5 rounded-full border-2 border-paper ${
                it.state === 'first'
                  ? 'bg-indicator-amber'
                  : it.state === 'done'
                    ? 'bg-indicator-green'
                    : it.state === 'now'
                      ? 'bg-indicator-teal outline outline-[3px] outline-indicator-teal/20'
                      : 'bg-line'
              }`}
            />
            <p className={`text-body ${it.state === 'dim' ? 'text-ink-dim' : 'font-bold'}`}>{it.title}</p>
            {it.sub && <p className="mt-0.5 font-mono text-caption text-ink-soft">{it.sub}</p>}
            {it.deviations && it.deviations.length > 0 && <DeviationDisclosure items={it.deviations} />}
            {it.inquiries?.map((q) => <InquiryBlock key={q.id} inquiry={q} onChanged={onChanged} />)}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 편차는 해당 단계에 인라인 펼침. 별도 이슈 섹션은 없다. */
function DeviationDisclosure({ items }: { items: NonNullable<Item['deviations']> }) {
  const [open, setOpen] = useState(items.some((d) => d.status === 'open'));
  const openCount = items.filter((d) => d.status === 'open').length;

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex cursor-pointer items-center gap-1 rounded-badge px-2 py-0.5 text-caption font-semibold ${
          openCount > 0 ? 'bg-phenol-pink text-white' : 'bg-badge-green-bg text-badge-green-fg'
        }`}
      >
        편차 {items.length}
        {openCount > 0 ? ' · 미해결' : ' · 조치완료'}
        {open ? <ChevronUp aria-hidden className="size-3.5" /> : <ChevronDown aria-hidden className="size-3.5" />}
      </button>

      {open && (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((d) => (
            <li
              key={d.id}
              className={`rounded-control border bg-surface p-3 text-caption ${
                d.status === 'open' ? 'border-phenol-pink/40' : 'border-line'
              }`}
            >
              <div className="flex items-center justify-between">
                <DataValue emphasis>{d.code}</DataValue>
                <span className="font-mono text-ink-soft">{mdt.format(new Date(d.created_at))}</span>
              </div>
              <p className="mt-1 text-body">{d.description}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-ink-soft">원인</dt>
                <dd className={d.cause ? '' : 'text-ink-dim'}>{d.cause ?? '제조자가 기록 중'}</dd>
                <dt className="text-ink-soft">조치</dt>
                <dd className={d.corrective_action ? '' : 'text-ink-dim'}>
                  {d.corrective_action ?? '제조자가 기록 중'}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 제조자 확인 요청 — 해당 단계에 인라인. 편차와 같은 자리다.
 * 답을 주기 전엔 공정이 멈춰 있다. "멈춰주세요"는 이유가 필수다.
 */
function InquiryBlock({ inquiry: q, onChanged }: { inquiry: Inq; onChanged: () => void }) {
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = q.decision === null;

  const proceed = async () => {
    setBusy(true);
    setError(null);
    try {
      await answerInquiry(q.id, 'proceed');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div
      className={`mt-2 rounded-control border p-3 text-caption ${
        open ? 'border-indicator-amber/50 bg-badge-amber-bg' : q.decision === 'proceed' ? 'border-line bg-surface' : 'border-phenol-pink/40 bg-phenol-pink/[.04]'
      }`}
    >
      <p className={`flex items-center gap-1.5 font-semibold ${open ? 'text-badge-amber-fg' : 'text-ink-soft'}`}>
        <MessageCircleQuestion aria-hidden className="size-4" />
        제조자 확인 요청 · <span className="font-mono font-normal">{mdt.format(new Date(q.asked_at))}</span>
        {!open && (
          <span className={`ml-auto ${q.decision === 'proceed' ? 'text-indicator-green' : 'text-phenol-pink'}`}>
            {INQUIRY_DECISION_LABEL[q.decision!]}{q.answered_at && ` · ${mdt.format(new Date(q.answered_at))}`}
          </span>
        )}
      </p>
      <p className="mt-1 text-body">{q.question}</p>
      {q.answer && <p className="mt-1 text-ink-soft">↳ {q.answer}</p>}

      {open && (
        <>
          {error && (
            <p role="alert" className="mt-2 text-phenol-pink">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="sign" className="flex-[2]" disabled={busy} onClick={() => void proceed()}>
              {busy ? '전송 중…' : '진행하세요'}
            </Button>
            <Button variant="ghost" className="flex-1" disabled={busy} onClick={() => setHolding(true)}>
              멈춰주세요
            </Button>
          </div>
        </>
      )}

      <PromptDialog
        open={holding}
        title="공정을 멈춰달라고 답합니다"
        description="이유를 남겨주세요. 제조자가 이를 보고 편차로 전환하거나, 재제조로 이어질 수 있습니다."
        fields={[{ name: 'answer', label: '이유', placeholder: '예) 다른 부서 로트는 곤란합니다. 동일 로트 입고 후 진행해 주세요' }]}
        confirmLabel="멈춰주세요"
        confirmVariant="deviation"
        onCancel={() => setHolding(false)}
        onConfirm={async (v) => {
          await answerInquiry(q.id, 'hold', v.answer ?? '');
          setHolding(false);
          onChanged();
        }}
      />
    </div>
  );
}

// ─── 코멘트 ────────────────────────────────────────────────────

function Comments({ data: r, onPosted }: { data: RequestDetailData; onPosted: () => void }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addComment(r.id, body.trim());
      setBody('');
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="코멘트" className="mt-10">
      <h2 className="text-title">코멘트</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {r.comments.length === 0 && <li className="text-caption text-ink-dim">아직 코멘트가 없습니다.</li>}
        {r.comments.map((c) => (
          <li key={c.id} className="rounded-control bg-bench px-4 py-3 text-body">
            <span className="font-bold">{c.author.name}</span>
            <span className="ml-1 text-caption text-ink-soft">
              {c.author.role === 'manufacturer' ? '제조자' : '의뢰자'} · {mdt.format(new Date(c.created_at))}
            </span>
            <p className="mt-1">{c.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <label htmlFor="comment-body" className="sr-only">
          코멘트 입력
        </label>
        <input
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && void submit()}
          placeholder="코멘트 입력…"
          className="flex-1 rounded-control border border-line bg-surface px-3 py-2 text-body placeholder:text-ink-dim focus-visible:border-indicator-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indicator-teal/40"
        />
        <Button variant="ghost" onClick={() => void submit()} disabled={busy || !body.trim()}>
          보내기
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-caption text-phenol-pink">
          {error}
        </p>
      )}
    </section>
  );
}
