/**
 * 목업 모드 — Supabase 없이 도는 인메모리 데이터.
 *
 * `VITE_MOCK=1`일 때 queries·mutations·auth가 여기로 온다.
 * 용도 둘: ① 백엔드 없이 화면 확인 ② 무료 Supabase가 7일 비활성으로 멈췄을 때
 * 포트폴리오 링크가 죽지 않게 하는 안전장치.
 *
 * 시나리오는 docs/seed-data.md와 같다. 단, 의뢰자 대시보드의 "리뷰 필요" 화면을
 * 바로 볼 수 있도록 REQ-040(HEPES · 1차 검토 완료)을 하나 더 넣었다. 시드에는 없다.
 * 시각은 전부 now() 기준 상대값이다.
 */

import type { CalibrationKind, InquiryDecision, UserRole } from './constants';
import { REMEASURE_LIMIT } from './constants';
import type {
  BatchInquiry,
  BatchListItem,
  BatchDeviation,
  BatchPrep,
  BatchStep,
  MyRequest,
  RequestDetailData,
  RequestListItem,
  ResultMeasurement,
  StepMeasurement,
} from './queries';

export const isMock = import.meta.env.VITE_MOCK === '1';

const ago = (h: number, m = 0) => new Date(Date.now() - (h * 60 + m) * 60000).toISOString();
const ahead = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

// ─── 계정 ──────────────────────────────────────────────────────

const ROLE_KEY = 'lg-mock-role';
export const mockAuth = {
  role(): UserRole | null {
    try {
      return (localStorage.getItem(ROLE_KEY) as UserRole | null) ?? null;
    } catch {
      return null;
    }
  },
  signIn(role: UserRole) {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch {
      /* private 모드 등 — 세션 없이도 화면은 뜬다 */
    }
  },
  signOut() {
    try {
      localStorage.removeItem(ROLE_KEY);
    } catch {
      /* noop */
    }
  },
};

// ─── 마스터 ────────────────────────────────────────────────────

const RECIPE = {
  pbs: { name: 'PBS 1X', target_params: { ph: 7.4, ph_tolerance: 0.05, volume_ml: 500, conductivity_ms_cm: 15 } },
  tris: { name: 'Tris-HCl 1M', target_params: { ph: 8.0, ph_min: 7.95, ph_max: 8.05, volume_ml: 1000 } },
  tae: { name: 'TAE 50X', target_params: { ph: 8.3, ph_tolerance: 0.05, volume_ml: 1000, conductivity_min: 11, conductivity_max: 12.5 } },
  hepes: { name: 'HEPES 1M', target_params: { ph: 7.5, ph_tolerance: 0.05, volume_ml: 500 } },
} as const;

const STEPS = {
  pbs: ['시약 칭량', '용해', 'pH 조정', '여과', 'QC 측정'],
  tris: ['시약 칭량', '용해', '온도 평형(25 °C)', 'pH 조정', 'QC 측정'],
  tae: ['시약 칭량', '용해', 'EDTA 첨가', 'pH 확인', '정용', 'QC 측정'],
  hepes: ['시약 칭량', '용해', 'pH 조정', '여과', 'QC 측정'],
} as const;

type StepStatus = 'todo' | 'running' | 'done' | 'deviation';
type Dev = RequestDetailData['batch'] extends infer B
  ? B extends { process_steps: (infer S)[] }
    ? S extends { deviations: (infer D)[] }
      ? D
      : never
    : never
  : never;

function steps(
  key: keyof typeof STEPS,
  batchId: string,
  states: StepStatus[],
  startedAgoH: number,
  devs: Record<number, Dev[]> = {},
) {
  return STEPS[key].map((name, i) => {
    const st = states[i] ?? 'todo';
    return {
      id: `${batchId}-s${i + 1}`,
      seq: i + 1,
      status: st,
      completed_at: st === 'done' ? ago(startedAgoH, -(i + 1) * 22) : null,
      recipe_steps: { name },
      deviations: devs[i + 1] ?? [],
    };
  });
}

// ─── 레시피 시약(행) · 로트 · 교정 이력 ──────────────────────────

type RKey = keyof typeof RECIPE;
const REAGENTS: Record<RKey, BatchPrep['reagents'][number]['reagent'][]> = {
  pbs: [
    { id: 'rr-pbs-1', seq: 1, name: 'NaCl', amount: 4.0, unit: 'g', kind: 'weighed' },
    { id: 'rr-pbs-2', seq: 2, name: 'KCl', amount: 0.1, unit: 'g', kind: 'weighed' },
    { id: 'rr-pbs-3', seq: 3, name: 'Na2HPO4', amount: 0.72, unit: 'g', kind: 'weighed' },
    { id: 'rr-pbs-4', seq: 4, name: 'KH2PO4', amount: 0.12, unit: 'g', kind: 'weighed' },
  ],
  tris: [
    { id: 'rr-tris-1', seq: 1, name: 'Tris base', amount: 121.14, unit: 'g', kind: 'weighed' },
    { id: 'rr-tris-2', seq: 2, name: '진한 HCl', amount: null, unit: 'mL', kind: 'titrated' },
  ],
  tae: [
    { id: 'rr-tae-1', seq: 1, name: 'Tris base', amount: 242.0, unit: 'g', kind: 'weighed' },
    { id: 'rr-tae-2', seq: 2, name: 'Na2EDTA·2H2O', amount: 18.61, unit: 'g', kind: 'weighed' },
    { id: 'rr-tae-3', seq: 3, name: '빙초산', amount: 57.1, unit: 'mL', kind: 'weighed' },
  ],
  hepes: [
    { id: 'rr-hep-1', seq: 1, name: 'HEPES', amount: 119.15, unit: 'g', kind: 'weighed' },
    { id: 'rr-hep-2', seq: 2, name: '5 M NaOH', amount: null, unit: 'mL', kind: 'titrated' },
  ],
};

const STEP_NOTES: Record<RKey, (string | null)[]> = {
  pbs: [null, null, '인산염 조합만으로 7.4 부근. 벗어날 때만 미세 조정', '멸균 여과', null],
  tris: [null, null, 'Tris는 -0.028 pH/°C. 온도 평형 전 pH 측정은 무의미하다', 'pH 8.00 도달까지 적정. 참고 40–45 mL — 검수 기준 아님', null],
  tae: [null, null, '분말은 pH 8 근처가 되기 전 잘 녹지 않는다. Tris를 먼저 녹인 뒤 넣는다', '적정이 아니라 확인 단계', null, null],
  hepes: [null, null, 'pH 7.50 도달까지 적정. 참고 20–25 mL', null, null],
};

const days = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const LOTS: (BatchPrep['reagents'][number]['lots'][number] & { reagent: string })[] = [
  { id: 'lot-nacl-1', reagent: 'NaCl', lot_number: 'NACL-2607', expires_on: days(395), note: null },
  { id: 'lot-nacl-0', reagent: 'NaCl', lot_number: 'NACL-2506', expires_on: days(-15), note: '의도적 만료 — DEV-03 시나리오' },
  { id: 'lot-kcl', reagent: 'KCl', lot_number: 'KCL-2611', expires_on: days(120), note: null },
  { id: 'lot-nahp', reagent: 'Na2HPO4', lot_number: 'NAHP-2703', expires_on: days(240), note: null },
  { id: 'lot-khp', reagent: 'KH2PO4', lot_number: 'KHP-2701', expires_on: days(180), note: null },
  { id: 'lot-tris', reagent: 'Tris base', lot_number: 'TRIS-2707', expires_on: days(365), note: null },
  // TAE·Tris-HCl 준비 체크에서 만료 차단을 보여주기 위한 로트
  { id: 'lot-tris-0', reagent: 'Tris base', lot_number: 'TRIS-2601', expires_on: days(-40), note: '만료' },
  { id: 'lot-aa', reagent: '빙초산', lot_number: 'AA-2705', expires_on: days(300), note: null },
  { id: 'lot-edta', reagent: 'Na2EDTA·2H2O', lot_number: 'EDTA-2612', expires_on: days(150), note: '분말' },
  { id: 'lot-hep', reagent: 'HEPES', lot_number: 'HEP-2704', expires_on: days(270), note: null },
  { id: 'lot-hcl', reagent: '진한 HCl', lot_number: 'HCL-2709', expires_on: days(420), note: '적정 시약' },
  { id: 'lot-naoh', reagent: '5 M NaOH', lot_number: 'NAOH-2702', expires_on: days(210), note: '적정 시약' },
];

const INSTRUMENTS = [
  { id: 'BAL-204', kind: '전자저울 (±0.1 mg)' },
  { id: 'pH-2000-A', kind: 'pH 미터 (ATC 내장)' },
  { id: 'COND-500', kind: '전도도계' },
];

interface Cal { id: string; instrument_id: string; kind: CalibrationKind; performed_at: string; by: string }
// pH미터 교정이 어제라 24시간을 넘겼다 — 준비 탭 ①에서 재교정을 요구하는 시나리오.
const calibrations: Cal[] = [
  { id: 'cal-1', instrument_id: 'BAL-204', kind: 'zero', performed_at: ago(2), by: '최제조' },
  { id: 'cal-2', instrument_id: 'pH-2000-A', kind: 'calibration', performed_at: ago(29, 12), by: '최제조' },
  { id: 'cal-3', instrument_id: 'COND-500', kind: 'calibration', performed_at: ago(5), by: '최제조' },
];

interface Prep { sop_confirmed_at: string | null; lot_confirmed_at: string | null; prep_completed_at: string | null;
                 reagents: Record<string, { reagent_lot_id: string; confirmed_at: string }> }
const preps = new Map<string, Prep>();
const prepOf = (batchId: string): Prep => {
  let p = preps.get(batchId);
  if (!p) { p = { sop_confirmed_at: null, lot_confirmed_at: null, prep_completed_at: null, reagents: {} }; preps.set(batchId, p); }
  return p;
};

interface Inq { id: string; batch_id: string; process_step_id: string | null; question: string; asked_at: string;
                decision: InquiryDecision | null; answer: string | null; answered_at: string | null }
const inquiries: Inq[] = [];

const stepMeasurements = new Map<string, StepMeasurement[]>();

// ─── 상태 (뮤테이션이 바꾼다) ────────────────────────────────────

interface Row {
  detail: RequestDetailData;
  requester: { name: string; org: string };
}

const rows: Row[] = [];

function push(
  detail: Omit<RequestDetailData, 'comments'> & { comments?: RequestDetailData['comments'] },
  requester: Row['requester'],
) {
  rows.push({ detail: { comments: [], ...detail }, requester });
}

const DEV01: Dev = {
  id: 'dev-01', code: 'DEV-01', description: '측정 pH 8.12 — 허용 7.95–8.05 상한 이탈',
  cause: null, corrective_action: null, status: 'open', created_at: ago(23, 25), resolved_at: null,
};
const DEV03: Dev = {
  id: 'dev-03', code: 'DEV-03', description: 'NaCl 로트 NACL-2506 유효기간 만료 확인',
  cause: '시약 재고 회전 누락', corrective_action: '대체 로트 NACL-2607 사용. 규격 일치 확인 후 진행',
  status: 'resolved', created_at: ago(20 * 24, 3 * 60 + 48), resolved_at: ago(20 * 24, 3 * 60 + 25),
};

const 최제조 = { name: '최제조' };

// LOT-2606-10 · REQ-033 · 완료
push({
  id: 'req-033', code: 'REQ-033', request_type: 'new', status: 'accepted', volume_ml: 1000,
  desired_completion_at: ago(20 * 24), reason: null, rejection_reason: null, created_at: ago(21 * 24),
  recipe: RECIPE.tae, parent: null,
  batch: {
    id: 'b-2606-10', lot_number: 'LOT-2606-10', status: 'completed',
    started_at: ago(20 * 24, 4 * 60), ended_at: ago(20 * 24, 60), created_at: ago(20 * 24, 4 * 60 + 10),
    process_steps: steps('tae', 'b-2606-10', ['done', 'done', 'done', 'done', 'done', 'done'], 20 * 24 + 4, { 1: [DEV03] }),
    inquiries: [],
    batch_summaries: { content: 'TAE 50X 1 L 제조 완료. 시약 로트 교체 1건 외 이상 없음.', confirmed_at: ago(20 * 24, 55) },
    result: {
      id: 'res-2606-10', manufacturer_signed_at: ago(20 * 24, 50), manufacturer_signed_by: 최제조,
      client_review_status: 'reviewed', client_signed_at: ago(20 * 24), revision_note: null,
      measurements: [
        { label: 'pH', value: 8.31, unit: '', instrument_id: 'pH-2000-A', captured_at: ago(20 * 24, 62) },
        { label: '전도도', value: 11.8, unit: 'mS/cm', instrument_id: 'COND-500', captured_at: ago(20 * 24, 61) },
        { label: '부피', value: 1000, unit: 'mL', instrument_id: null, captured_at: null },
      ],
    },
  },
}, { name: '김의뢰', org: 'QC 2팀' });

// LOT-2607-01 · REQ-039 · 완료 → 재제조 원본
push({
  id: 'req-039', code: 'REQ-039', request_type: 'new', status: 'accepted', volume_ml: 1000,
  desired_completion_at: ago(48), reason: null, rejection_reason: null, created_at: ago(76),
  recipe: RECIPE.tae, parent: null,
  batch: {
    id: 'b-2607-01', lot_number: 'LOT-2607-01', status: 'completed',
    started_at: ago(53), ended_at: ago(51), created_at: ago(53, 10),
    process_steps: steps('tae', 'b-2607-01', ['done', 'done', 'done', 'done', 'done', 'done'], 53),
    inquiries: [],
    batch_summaries: { content: 'TAE 50X 1 L 제조 완료. 전 공정 6단계 편차 없이 진행. 멸균 여과 후 실온 보관.', confirmed_at: ago(50, 55) },
    result: {
      id: 'res-2607-01', manufacturer_signed_at: ago(50, 50), manufacturer_signed_by: 최제조,
      client_review_status: 'reviewed', client_signed_at: ago(48, 25), revision_note: null,
      measurements: [
        { label: 'pH', value: 8.28, unit: '', instrument_id: 'pH-2000-A', captured_at: ago(51, 12) },
        { label: '전도도', value: 9.4, unit: 'mS/cm', instrument_id: 'COND-500', captured_at: ago(51, 10) },
        { label: '부피', value: 1000, unit: 'mL', instrument_id: null, captured_at: null },
      ],
    },
  },
}, { name: '김의뢰', org: 'QC 2팀' });

// 목업 전용 — 리뷰 필요 화면을 바로 보기 위해. 시드에는 없다.
push({
  id: 'req-040', code: 'REQ-040', request_type: 'new', status: 'accepted', volume_ml: 500,
  desired_completion_at: ahead(6), reason: null, rejection_reason: null, created_at: ago(30),
  recipe: RECIPE.hepes, parent: null,
  batch: {
    id: 'b-2607-05', lot_number: 'LOT-2607-05', status: 'completed',
    started_at: ago(4, 30), ended_at: ago(2, 40), created_at: ago(4, 40),
    process_steps: steps('hepes', 'b-2607-05', ['done', 'done', 'done', 'done', 'done'], 4.5),
    inquiries: [],
    batch_summaries: { content: 'HEPES 1M 500 mL 제조 완료. 편차 없음. 0.22 µm 여과 후 4 °C 보관.', confirmed_at: ago(2, 30) },
    result: {
      id: 'res-2607-05', manufacturer_signed_at: ago(2, 20), manufacturer_signed_by: 최제조,
      client_review_status: null, client_signed_at: null, revision_note: null,
      measurements: [
        { label: 'pH', value: 7.51, unit: '', instrument_id: 'pH-2000-A', captured_at: ago(2, 28) },
        { label: '부피', value: 500, unit: 'mL', instrument_id: null, captured_at: null },
      ],
    },
  },
}, { name: '김의뢰', org: 'QC 2팀' });

// LOT-2607-02 · REQ-041 · 편차
push({
  id: 'req-041', code: 'REQ-041', request_type: 'new', status: 'accepted', volume_ml: 1000,
  desired_completion_at: ahead(19), reason: null, rejection_reason: null, created_at: ago(30),
  recipe: RECIPE.tris, parent: null,
  batch: {
    id: 'b-2607-02', lot_number: 'LOT-2607-02', status: 'deviation',
    started_at: ago(24, 15), ended_at: null, created_at: ago(24, 20),
    process_steps: steps('tris', 'b-2607-02', ['done', 'done', 'done', 'deviation', 'todo'], 24.25, { 4: [DEV01] }),
    batch_summaries: null, result: null, inquiries: [],
  },
}, { name: '김의뢰', org: 'QC 2팀' });

// LOT-2607-03 · REQ-042 · 진행 3/5
push({
  id: 'req-042', code: 'REQ-042', request_type: 'new', status: 'accepted', volume_ml: 500,
  desired_completion_at: ahead(25), reason: null, rejection_reason: null, created_at: ago(5, 23),
  recipe: RECIPE.pbs, parent: null,
  batch: {
    id: 'b-2607-03', lot_number: 'LOT-2607-03', status: 'running',
    started_at: ago(0, 33), ended_at: null, created_at: ago(0, 35),
    process_steps: steps('pbs', 'b-2607-03', ['done', 'done', 'running', 'todo', 'todo'], 0.55),
    batch_summaries: null, result: null, inquiries: [],
  },
  comments: [
    { id: 'c1', body: '지난번보다 pH 허용범위 좁게 부탁드립니다', created_at: ago(5, 21), author: { name: '김의뢰', role: 'client' } },
    { id: 'c2', body: '반영했습니다. ±0.05 이내로 관리했어요', created_at: ago(4, 45), author: { name: '최제조', role: 'manufacturer' } },
  ],
}, { name: '김의뢰', org: 'QC 2팀' });

// REQ-046 · 재제조 · 대기
push({
  id: 'req-046', code: 'REQ-046', request_type: 'remake', status: 'pending', volume_ml: 1000,
  desired_completion_at: ahead(68), reason: '전기영동 진행 중 밴드 번짐 발생. 버퍼 전도도 이상 의심됩니다.',
  rejection_reason: null, created_at: ago(0, 25), recipe: RECIPE.tae, parent: { code: 'REQ-039' },
  batch: null,
}, { name: '김의뢰', org: 'QC 2팀' });

// 다른 의뢰자 — 콘솔에서만 보인다
push({
  id: 'req-044', code: 'REQ-044', request_type: 'new', status: 'pending', volume_ml: 500,
  desired_completion_at: ahead(42), reason: null, rejection_reason: null, created_at: ago(22, 30),
  recipe: RECIPE.tris, parent: null, batch: null,
}, { name: '이연구', org: 'R&D팀' });
push({
  id: 'req-045', code: 'REQ-045', request_type: 'new', status: 'pending', volume_ml: 1000,
  desired_completion_at: ahead(48), reason: null, rejection_reason: null, created_at: ago(1),
  recipe: RECIPE.pbs, parent: null, batch: null,
}, { name: '박실험', org: '분자생물 1팀' });
push({
  id: 'req-043', code: 'REQ-043', request_type: 'new', status: 'accepted', volume_ml: 1000,
  desired_completion_at: ahead(18), reason: null, rejection_reason: null, created_at: ago(4, 5),
  recipe: RECIPE.tae, parent: null,
  batch: {
    id: 'b-2607-04', lot_number: 'LOT-2607-04', status: 'preparing',
    started_at: null, ended_at: null, created_at: ago(3, 35),
    process_steps: steps('tae', 'b-2607-04', [], 0), batch_summaries: null, result: null, inquiries: [],
  },
}, { name: '박실험', org: '분자생물 1팀' });

const delay = <T,>(v: T): Promise<T> => new Promise((res) => setTimeout(() => res(v), 120));
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// ─── 의뢰자 ────────────────────────────────────────────────────

const mine = () => rows.filter((r) => r.requester.name === '김의뢰');

export const mockClient = {
  fetchMyRequests(): Promise<MyRequest[]> {
    return delay(
      mine()
        .map(({ detail: d }) => ({
          id: d.id, code: d.code, request_type: d.request_type, status: d.status,
          volume_ml: d.volume_ml, desired_completion_at: d.desired_completion_at,
          rejection_reason: d.rejection_reason, created_at: d.created_at, recipe: d.recipe,
          batch: d.batch && {
            id: d.batch.id, lot_number: d.batch.lot_number, status: d.batch.status,
            process_steps: d.batch.process_steps.map((s) => ({ status: s.status })),
            deviations: d.batch.process_steps.flatMap((s) => s.deviations.map((x) => ({ status: x.status }))),
            inquiries: inquiries.filter((q) => q.batch_id === d.batch!.id).map((q) => ({ decision: q.decision })),
            result: d.batch.result && {
              manufacturer_signed_at: d.batch.result.manufacturer_signed_at,
              client_review_status: d.batch.result.client_review_status,
            },
          },
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  },
  fetchRequestDetail(id: string): Promise<RequestDetailData> {
    const r = rows.find((x) => x.detail.id === id);
    if (!r) return Promise.reject(new Error('의뢰를 찾을 수 없습니다'));
    const d = clone(r.detail);
    if (d.batch) d.batch.inquiries = inquiries.filter((q) => q.batch_id === d.batch!.id).map(({ batch_id: _b, ...q }) => q);
    return delay(d);
  },
  answerInquiry(inquiryId: string, decision: InquiryDecision, answer?: string) {
    const q = inquiries.find((x) => x.id === inquiryId);
    if (!q || q.decision !== null) return Promise.reject(new Error('답할 수 있는 요청이 아닙니다'));
    if (decision === 'hold' && !answer?.trim()) return Promise.reject(new Error('멈춰달라면 이유가 있어야 합니다'));
    q.decision = decision; q.answer = answer ?? null; q.answered_at = new Date().toISOString();
    if (decision === 'proceed') {
      const b = rows.map((r) => r.detail.batch).find((x) => x?.id === q.batch_id);
      if (b && b.status === 'waiting_client')
        b.status = b.process_steps.some((s) => s.deviations.some((x) => x.status === 'open')) ? 'deviation' : 'running';
    }
    return delay(undefined);
  },
  signClientReview(resultId: string) {
    const r = rows.find((x) => x.detail.batch?.result?.id === resultId)?.detail.batch?.result;
    if (!r) return Promise.reject(new Error('결과를 찾을 수 없습니다'));
    if (!r.manufacturer_signed_at) return Promise.reject(new Error('제조자 1차 검토 전에는 리뷰할 수 없습니다'));
    r.client_review_status = 'reviewed';
    r.client_signed_at = new Date().toISOString();
    return delay(undefined);
  },
  requestRevision(resultId: string, note: string) {
    const r = rows.find((x) => x.detail.batch?.result?.id === resultId)?.detail.batch?.result;
    if (!r) return Promise.reject(new Error('결과를 찾을 수 없습니다'));
    r.client_review_status = 'revision_requested';
    r.client_signed_at = new Date().toISOString();
    r.revision_note = note;
    return delay(undefined);
  },
  requestRemake(parentId: string, reason: string, desiredAt: string) {
    const p = rows.find((x) => x.detail.id === parentId);
    if (!p) return Promise.reject(new Error('원본 의뢰를 찾을 수 없습니다'));
    const n = rows.length + 40;
    const code = `REQ-${String(n).padStart(3, '0')}`;
    push({
      id: `req-${n}`, code, request_type: 'remake', status: 'pending', volume_ml: p.detail.volume_ml,
      desired_completion_at: desiredAt, reason, rejection_reason: null, created_at: new Date().toISOString(),
      recipe: p.detail.recipe, parent: { code: p.detail.code }, batch: null,
    }, p.requester);
    return delay({ code });
  },
  addComment(requestId: string, body: string) {
    const r = rows.find((x) => x.detail.id === requestId);
    if (!r) return Promise.reject(new Error('의뢰를 찾을 수 없습니다'));
    r.detail.comments.push({
      id: `c${Date.now()}`, body, created_at: new Date().toISOString(),
      author: { name: '김의뢰', role: 'client' },
    });
    return delay(undefined);
  },
};

// ─── 제조자 ────────────────────────────────────────────────────

export const mockConsole = {
  fetchPendingRequests(): Promise<RequestListItem[]> {
    return delay(
      rows
        .filter((r) => r.detail.status === 'pending')
        .map(({ detail: d, requester }) => {
          const parent = d.parent ? rows.find((x) => x.detail.code === d.parent!.code) : null;
          return {
            id: d.id, code: d.code, request_type: d.request_type, status: d.status,
            volume_ml: d.volume_ml, desired_completion_at: d.desired_completion_at,
            reason: d.reason, created_at: d.created_at, requester, recipe: d.recipe,
            parent: parent
              ? { code: parent.detail.code, batches: parent.detail.batch ? { lot_number: parent.detail.batch.lot_number } : null }
              : null,
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  },
  fetchBatches(): Promise<BatchListItem[]> {
    return delay(
      rows
        .filter((r) => r.detail.batch)
        .map(({ detail: d, requester }) => ({
          id: d.batch!.id, lot_number: d.batch!.lot_number, status: d.batch!.status, started_at: d.batch!.started_at,
          requests: {
            code: d.code, volume_ml: d.volume_ml, desired_completion_at: d.desired_completion_at,
            profiles: requester, buffer_recipes: d.recipe,
          },
        }))
        .sort((a, b) => b.lot_number.localeCompare(a.lot_number)),
    );
  },
  fetchBatchSteps(batchId: string): Promise<BatchStep[]> {
    const b = rows.find((r) => r.detail.batch?.id === batchId)?.detail.batch;
    if (!b) return delay([]);
    const recipeKey = (Object.keys(RECIPE) as (keyof typeof RECIPE)[]).find((k) => RECIPE[k].name === rows.find((r) => r.detail.batch?.id === batchId)!.detail.recipe.name)!;
    const titrated = recipeKey === 'tris' ? 4 : recipeKey === 'hepes' || recipeKey === 'pbs' ? 3 : -1;
    const seeded = (stepId: string, rows: Omit<StepMeasurement, 'id' | 'attempt' | 'calibration_id'>[]) => {
      if (!stepMeasurements.has(stepId))
        stepMeasurements.set(stepId, rows.map((m, i) => ({ ...m, id: `${stepId}-m${i}`, attempt: 1, calibration_id: 'cal-2' })));
      return stepMeasurements.get(stepId)!;
    };
    return delay(
      b.process_steps.map((s) => ({
        id: s.id, seq: s.seq, status: s.status, completed_at: s.completed_at, note: null,
        recipe_steps: {
          name: s.recipe_steps.name,
          kind: s.seq === 1 ? 'weighed' : s.seq === titrated ? 'titrated' : null,
          reagent: s.seq === titrated ? (recipeKey === 'tris' ? '진한 HCl' : recipeKey === 'hepes' ? '5 M NaOH' : '1 M HCl / 1 M NaOH') : null,
          target_amount: null, target_unit: null,
          note: STEP_NOTES[recipeKey][s.seq - 1] ?? null,
        },
        measurements:
          batchId === 'b-2607-03' && s.seq === 3
            ? seeded(s.id, [
                { label: 'pH', value: 7.41, unit: '', source: 'instrument', instrument_id: 'pH-2000-A', captured_at: ago(0, 4), captured_temp_c: 22.4, override_reason: null },
                { label: '온도', value: 22.4, unit: '°C', source: 'instrument', instrument_id: 'pH-2000-A', captured_at: ago(0, 4), captured_temp_c: null, override_reason: null },
              ])
            : batchId === 'b-2607-02' && s.seq === 4
              ? seeded(s.id, [{ label: 'pH', value: 8.12, unit: '', source: 'instrument', instrument_id: 'pH-2000-A', captured_at: ago(23, 25), captured_temp_c: 25, override_reason: null }])
              // 준비 체크 → 공정 시작 → 4단계에서 이탈값을 만나 재측량하는 데모 서사(docs/console-ux-0917.md §5)
              : batchId === 'b-2607-04' && s.seq === 4
                ? seeded(s.id, [{ label: 'pH', value: 8.38, unit: '', source: 'instrument', instrument_id: 'pH-2000-A', captured_at: new Date().toISOString(), captured_temp_c: 24.8, override_reason: null }])
                : seeded(s.id, []),
      })),
    );
  },
  fetchBatchDeviations(batchId: string): Promise<BatchDeviation[]> {
    const b = rows.find((r) => r.detail.batch?.id === batchId)?.detail.batch;
    return delay(
      (b?.process_steps ?? []).flatMap((s) =>
        s.deviations.map((d) => ({ ...d, process_steps: { seq: s.seq, recipe_steps: { name: s.recipe_steps.name } } })),
      ),
    );
  },
  fetchCounts() {
    const batches = rows.map((r) => r.detail.batch).filter(Boolean);
    return delay({
      pendingRequests: rows.filter((r) => r.detail.status === 'pending').length,
      activeBatches: batches.filter((b) => b!.status === 'running' || b!.status === 'deviation').length,
      openDeviations: batches.flatMap((b) => b!.process_steps.flatMap((s) => s.deviations)).filter((d) => d.status === 'open').length,
    });
  },
  fetchResultMeasurementsByLot(lot: string): Promise<ResultMeasurement[]> {
    return delay(rows.find((r) => r.detail.batch?.lot_number === lot)?.detail.batch?.result?.measurements ?? []);
  },
  acceptRequest(requestId: string) {
    const r = rows.find((x) => x.detail.id === requestId);
    if (!r || r.detail.status !== 'pending') return Promise.reject(new Error('대기중인 의뢰가 아닙니다'));
    const key = (Object.keys(RECIPE) as (keyof typeof RECIPE)[]).find((k) => RECIPE[k].name === r.detail.recipe.name)!;
    const n = rows.filter((x) => x.detail.batch).length + 6;
    const lot = `LOT-${new Date().toISOString().slice(2, 4)}${new Date().toISOString().slice(5, 7)}-${String(n).padStart(2, '0')}`;
    r.detail.status = 'accepted';
    r.detail.batch = {
      id: `b-${n}`, lot_number: lot, status: 'preparing', started_at: null, ended_at: null,
      created_at: new Date().toISOString(), process_steps: steps(key, `b-${n}`, [], 0),
      batch_summaries: null, result: null, inquiries: [],
    };
    return delay({ lot_number: lot });
  },
  rejectRequest(requestId: string, reason: string) {
    const r = rows.find((x) => x.detail.id === requestId);
    if (!r) return Promise.reject(new Error('의뢰를 찾을 수 없습니다'));
    r.detail.status = 'rejected';
    r.detail.rejection_reason = reason;
    r.detail.comments.push({ id: `c${Date.now()}`, body: `반려되었습니다 — ${reason}`, created_at: new Date().toISOString(), author: { name: '최제조', role: 'manufacturer' } });
    return delay(undefined);
  },
  completeStep(stepId: string) {
    const b = rows.map((r) => r.detail.batch).find((x) => x?.process_steps.some((s) => s.id === stepId));
    if (!b) return Promise.reject(new Error('공정 단계를 찾을 수 없습니다'));
    const s = b.process_steps.find((x) => x.id === stepId)!;
    s.status = 'done';
    s.completed_at = new Date().toISOString();
    const next = b.process_steps.find((x) => x.status === 'todo');
    if (next) {
      next.status = 'running';
      if (b.status === 'preparing') { b.status = 'running'; b.started_at = new Date().toISOString(); }
    } else {
      b.status = 'completed';
      b.ended_at = new Date().toISOString();
    }
    return delay(undefined);
  },
  registerDeviation(stepId: string, description: string) {
    const b = rows.map((r) => r.detail.batch).find((x) => x?.process_steps.some((s) => s.id === stepId));
    if (!b) return Promise.reject(new Error('공정 단계를 찾을 수 없습니다'));
    const s = b.process_steps.find((x) => x.id === stepId)!;
    const n = rows.flatMap((r) => r.detail.batch?.process_steps.flatMap((x) => x.deviations) ?? []).length + 5;
    s.deviations.push({ id: `dev-${n}`, code: `DEV-${String(n).padStart(2, '0')}`, description, cause: null, corrective_action: null, status: 'open', created_at: new Date().toISOString(), resolved_at: null });
    s.status = 'deviation';
    b.status = 'deviation';
    return delay(undefined);
  },
  resolveDeviation(devId: string, cause: string, action: string) {
    for (const b of rows.map((r) => r.detail.batch)) {
      for (const s of b?.process_steps ?? []) {
        const d = s.deviations.find((x) => x.id === devId);
        if (d) {
          Object.assign(d, { cause, corrective_action: action, status: 'resolved', resolved_at: new Date().toISOString() });
          if (!s.deviations.some((x) => x.status === 'open')) { s.status = 'running'; if (b!.status === 'deviation') b!.status = 'running'; }
          return delay(undefined);
        }
      }
    }
    return Promise.reject(new Error('편차를 찾을 수 없습니다'));
  },

  // ─── 준비 체크 ───
  fetchBatchPrep(batchId: string): Promise<BatchPrep> {
    const row = rows.find((r) => r.detail.batch?.id === batchId);
    if (!row?.detail.batch) return Promise.reject(new Error('배치를 찾을 수 없습니다'));
    const b = row.detail.batch;
    const key = (Object.keys(RECIPE) as RKey[]).find((k) => RECIPE[k].name === row.detail.recipe.name)!;
    const p = prepOf(batchId);
    const lastOf = (id: string) => {
      const c = calibrations.filter((x) => x.instrument_id === id).sort((a, z) => z.performed_at.localeCompare(a.performed_at))[0];
      return c ? { kind: c.kind, performed_at: c.performed_at, performed_by: { name: c.by } } : null;
    };
    return delay({
      batch: { id: b.id, lot_number: b.lot_number, status: b.status, created_at: b.created_at,
               sop_confirmed_at: p.sop_confirmed_at, lot_confirmed_at: p.lot_confirmed_at, prep_completed_at: p.prep_completed_at },
      instruments: INSTRUMENTS.map((i) => ({ ...i, last: lastOf(i.id) })),
      reagents: REAGENTS[key].map((r) => ({
        reagent: r,
        lots: LOTS.filter((l) => l.reagent === r.name).map(({ reagent: _r, ...l }) => l),
        chosen: p.reagents[r.id] ?? null,
      })),
      steps: STEPS[key].map((name, i) => ({ seq: i + 1, name, note: STEP_NOTES[key][i] ?? null })),
    });
  },
  recordCalibration(instrumentId: string, kind: CalibrationKind) {
    calibrations.push({ id: `cal-${Date.now()}`, instrument_id: instrumentId, kind, performed_at: new Date().toISOString(), by: '최제조' });
    return delay(undefined);
  },
  confirmSop(batchId: string) { prepOf(batchId).sop_confirmed_at = new Date().toISOString(); return delay(undefined); },
  selectBatchReagent(batchId: string, recipeReagentId: string, reagentLotId: string) {
    const lot = LOTS.find((l) => l.id === reagentLotId);
    if (!lot) return Promise.reject(new Error('로트를 찾을 수 없습니다'));
    if (lot.expires_on < days(0)) return Promise.reject(new Error(`만료된 로트입니다 (${lot.lot_number} · 유효 ${lot.expires_on})`));
    prepOf(batchId).reagents[recipeReagentId] = { reagent_lot_id: reagentLotId, confirmed_at: new Date().toISOString() };
    return delay(undefined);
  },
  confirmLot(batchId: string) { prepOf(batchId).lot_confirmed_at = new Date().toISOString(); return delay(undefined); },
  startProcess(batchId: string) {
    const row = rows.find((r) => r.detail.batch?.id === batchId);
    if (!row?.detail.batch) return Promise.reject(new Error('배치를 찾을 수 없습니다'));
    const b = row.detail.batch;
    const key = (Object.keys(RECIPE) as RKey[]).find((k) => RECIPE[k].name === row.detail.recipe.name)!;
    const p = prepOf(batchId);
    const bal = calibrations.some((c) => c.instrument_id === 'BAL-204' && c.kind === 'zero' && c.performed_at >= b.created_at);
    const ph = calibrations.some((c) => c.instrument_id === 'pH-2000-A' && c.kind === 'calibration' && c.performed_at >= ago(24));
    if (!(bal && ph)) return Promise.reject(new Error('계측기 0점·교정이 끝나지 않았습니다'));
    if (!p.sop_confirmed_at) return Promise.reject(new Error('SOP 확인이 끝나지 않았습니다'));
    const missing = REAGENTS[key].filter((r) => r.kind === 'weighed' && !p.reagents[r.id]).length;
    if (missing) return Promise.reject(new Error(`로트를 고르지 않은 시약이 ${missing}개 있습니다`));
    if (!p.lot_confirmed_at) return Promise.reject(new Error('제조 LOT 확인이 끝나지 않았습니다'));
    p.prep_completed_at = new Date().toISOString();
    b.status = 'running'; b.started_at = p.prep_completed_at;
    const first = b.process_steps[0]; if (first) first.status = 'running';
    return delay(undefined);
  },

  // ─── 재측량 ───
  remeasure(stepId: string, label: string) {
    const list = stepMeasurements.get(stepId) ?? [];
    const same = list.filter((m) => m.label === label);
    const last = same[same.length - 1];
    if (!last) return Promise.reject(new Error(`이 단계에 ${label} 측정값이 없습니다`));
    if (same.length >= REMEASURE_LIMIT) return Promise.reject(new Error('재측량 한도(10회)에 도달했습니다. 0점·교정을 다시 확인하세요'));
    const cal = calibrations.filter((c) => c.instrument_id === last.instrument_id).sort((a, z) => z.performed_at.localeCompare(a.performed_at))[0];
    // 데모: 목표 pH 쪽으로 0.04씩 끌어온다. 두세 번이면 범위 안에 들어온다.
    const row = rows.find((r) => r.detail.batch?.process_steps.some((x) => x.id === stepId));
    const goal = row?.detail.recipe.target_params.ph ?? last.value;
    const drift = label === 'pH' ? Math.sign(goal - last.value) * Math.min(0.04, Math.abs(goal - last.value)) : (Math.random() - 0.5) * 0.02;
    list.push({ ...last, id: `${stepId}-m${Date.now()}`, value: Math.round((last.value + drift) * 100) / 100,
                captured_at: new Date().toISOString(), attempt: same.length + 1, calibration_id: cal?.id ?? null });
    stepMeasurements.set(stepId, list);
    return delay(undefined);
  },
  overrideMeasurement(stepId: string, label: string, value: number, reason: string) {
    if (!reason.trim()) return Promise.reject(new Error('수동 입력 사유를 입력해야 합니다'));
    const list = stepMeasurements.get(stepId) ?? [];
    const same = list.filter((m) => m.label === label);
    const last = same[same.length - 1];
    list.push({ id: `${stepId}-m${Date.now()}`, label, value, unit: last?.unit ?? '', source: 'manual',
                instrument_id: last?.instrument_id ?? null, captured_at: null, captured_temp_c: null,
                override_reason: reason, attempt: same.length + 1, calibration_id: null });
    stepMeasurements.set(stepId, list);
    return delay(undefined);
  },

  // ─── 확인 요청 ───
  fetchBatchInquiries(batchId: string): Promise<BatchInquiry[]> {
    const b = rows.find((r) => r.detail.batch?.id === batchId)?.detail.batch;
    return delay(
      inquiries.filter((q) => q.batch_id === batchId).map((q) => {
        const s = b?.process_steps.find((x) => x.id === q.process_step_id);
        return { id: q.id, question: q.question, asked_at: q.asked_at, decision: q.decision, answer: q.answer, answered_at: q.answered_at,
                 process_steps: s ? { seq: s.seq, recipe_steps: { name: s.recipe_steps.name } } : null };
      }).sort((a, z) => z.asked_at.localeCompare(a.asked_at)),
    );
  },
  askClient(stepId: string, question: string) {
    if (!question.trim()) return Promise.reject(new Error('질문을 입력해야 합니다'));
    const b = rows.map((r) => r.detail.batch).find((x) => x?.process_steps.some((s) => s.id === stepId));
    if (!b) return Promise.reject(new Error('공정 단계를 찾을 수 없습니다'));
    if (inquiries.some((q) => q.batch_id === b.id && q.decision === null)) return Promise.reject(new Error('답을 기다리는 요청이 이미 있습니다'));
    inquiries.push({ id: `inq-${Date.now()}`, batch_id: b.id, process_step_id: stepId, question, asked_at: new Date().toISOString(),
                     decision: null, answer: null, answered_at: null });
    b.status = 'waiting_client';
    return delay(undefined);
  },
};
