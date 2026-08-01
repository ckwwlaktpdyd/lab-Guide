import {
  Button,
  Card,
  DataValue,
  GradientStepper,
  InstrumentBadge,
  StatusBadge,
} from './index';

const CLIENT_STEPS = ['의뢰', '수락', '공정', '검토', '완료'] as const;

/**
 * 공통 컴포넌트 갤러리. docs/mockups/design-tokens.html의 코드판이다.
 * 토큰을 고칠 때 여기서 회귀를 눈으로 확인한다.
 */
export function Preview() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-display">공통 컴포넌트</h1>
      <p className="mt-2 text-caption text-ink-soft">
        src/shared/ui · 값의 원천은 docs/mockups/design-tokens.html
      </p>
      <div className="my-8 h-1.5 rounded-sm bg-ph-progress" />

      <Section title="StatusBadge" note="도메인 상태가 아니라 표현용 톤을 받는다">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="wait">수락 대기</StatusBadge>
          <StatusBadge tone="running">진행중</StatusBadge>
          <StatusBadge tone="done">리뷰 완료</StatusBadge>
          <StatusBadge tone="deviation">편차 1</StatusBadge>
          <StatusBadge tone="remake">재제조</StatusBadge>
        </div>
      </Section>

      <Section title="GradientStepper" note="시그니처 — 진행률에만 그라디언트를 쓴다">
        <GradientStepper steps={CLIENT_STEPS} current={3} showLabels />
        <div className="mt-6 flex items-center gap-4">
          <GradientStepper steps={CLIENT_STEPS} current={0} className="w-48" />
          <span className="text-caption text-ink-soft">수락 대기</span>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <GradientStepper steps={CLIENT_STEPS} current={2} className="w-48" />
          <span className="text-caption text-ink-soft">공정 진행중</span>
        </div>
      </Section>

      <Section title="InstrumentBadge" note="자동 수집값의 출처 — 의뢰자 결과 패널에도 같은 배지">
        <InstrumentBadge instrumentId="pH-2000-A" capturedAt={new Date('2026-07-20T14:31:00')} />
        <div className="mt-3">
          <InstrumentBadge
            instrumentId="COND-500"
            capturedAt={new Date('2026-07-18T11:20:00')}
            hint="· 수동 입력하려면 값을 탭하세요"
          />
        </div>
      </Section>

      <Section title="Button" note="green은 서명·단계 완료 전용">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="sign">단계 완료</Button>
          <Button variant="deviation">편차 등록</Button>
          <Button variant="primary">수락 → 배치 생성</Button>
          <Button variant="ghost">보완 요청</Button>
          <Button variant="ghost" disabled>
            결과 입력
          </Button>
        </div>
      </Section>

      <Section title="Card" note="그림자 없음 — 선택은 ring으로">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <DataValue emphasis>LOT-2607-03</DataValue>
            <p className="mt-1 text-caption text-ink-soft">PBS 1X · 김의뢰 · 3/5 단계</p>
          </Card>
          <Card selected className="p-4">
            <DataValue emphasis>LOT-2607-02</DataValue>
            <p className="mt-1 text-caption text-ink-soft">선택됨 · Tris-HCl 1M · 4/5 단계</p>
          </Card>
        </div>
      </Section>

      <Section title="DataValue" note="LOT·측정값·타임스탬프는 모노 + tabular-nums">
        <p className="text-body">
          pH <DataValue emphasis>7.41</DataValue>{' '}
          <span className="text-ink-soft">(목표 7.40)</span> · 부피{' '}
          <DataValue emphasis>500</DataValue> mL
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-title">{title}</h2>
      <p className="mb-4 mt-1 text-caption text-ink-soft">{note}</p>
      <Card className="p-5">{children}</Card>
    </section>
  );
}
