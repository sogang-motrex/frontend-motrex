/**
 * 비교표(SCR-04) 데이터.
 * 형식은 AI 서버 /ai/compare · /ai/recheck 실제 응답(ai-motrex docs/examples)과 같다.
 * 백엔드 API가 나오기 전까지는 lib/mock/compare/ 의 예시 파일을 가짜 데이터로 쓴다.
 */
import checkRequest from "@/lib/mock/compare/compare_request.json";
import checkResponse from "@/lib/mock/compare/compare_response.json";
import sameRequest from "@/lib/mock/compare/compare_same_request.json";
import sameResponse from "@/lib/mock/compare/compare_same_response.json";
import recheckRequest from "@/lib/mock/compare/recheck_request.json";
import recheckResponse from "@/lib/mock/compare/recheck_response.json";

/* ------------------------------------------------------------------ */
/* 타입                                                                */
/* ------------------------------------------------------------------ */

export type Verdict = "SAME" | "DIFF" | "CHECK";
export type ConditionStatus = "SUPPORTED" | "UNCERTAIN" | "INSUFFICIENT" | "CONTRADICTED";

/** 우리 기술 쪽 근거. DESCRIPTION은 techDescription 기준, ANSWER는 그 답변 글 기준 위치 */
export interface EvidenceFact {
  factId: string;
  source: "DESCRIPTION" | "ANSWER";
  quote: string;
  start: number;
  end: number;
}

export interface Vote {
  judge: string;
  status: ConditionStatus;
  reason: string;
}

export interface CompareCondition {
  conditionId: string;
  type: string;
  claimQuote: string;
  start: number; // claimText 기준
  end: number;
  status: ConditionStatus;
  statusKo: string;
  evidence: EvidenceFact[];
  votes: Vote[];
  flags: string[];
  questionId: string | null;
}

export interface CompareRow {
  elementId: string;
  elementLabel: string;
  kind: string;
  text: string;
  start: number; // claimText 기준
  end: number;
  verdict: Verdict;
  label: string; // 확인 · 부분확인 · 미확인 · 상충
  counterpart: string | null;
  counterpartStatus: string; // STATED · ASSUMED · NONE
  designEvidence: EvidenceFact[];
  aiNote: string;
  notices: string[];
  conditions: CompareCondition[];
}

export interface CheckItem {
  questionId: string;
  elementLabel: string;
  conditionIds: string[];
  kind: string; // CONDITION · ALIGNMENT · DISAGREE
  text: string;
}

export interface AlignmentItem {
  claimName: string;
  inputName: string | null;
  status: string;
}

export interface CompareResponse {
  docId: string;
  claimNo: number;
  claimRef: string;
  claimText: string;
  level: string;
  retrieval: string;
  summary: Record<Verdict, number>;
  rows: CompareRow[];
  checkItems: CheckItem[];
  alignment: AlignmentItem[];
  alignmentNotes: string[];
  answers: EvidenceFact[];
  llmCalls: number;
  elapsedMs: number;
  cached: boolean;
}

export interface CompareRequest {
  docId: string;
  claimNo: number;
  techDescription: string;
  sensitive: boolean;
  level: string;
  retrieval: string;
  alignment?: AlignmentItem[] | null;
  answers?: AnswerInput[];
}

export interface AnswerInput {
  questionId: string;
  conditionIds: string[];
  answer: string;
}

/* ------------------------------------------------------------------ */
/* 화면 표시용 이름                                                     */
/* ------------------------------------------------------------------ */

export const VERDICT_META: Record<Verdict, { ko: string; className: string }> = {
  SAME: { ko: "유사", className: "bg-[#1E3A5F] text-white" },
  DIFF: { ko: "차이", className: "bg-[#6B7280] text-white" },
  CHECK: { ko: "확인 필요", className: "bg-[#F6E7C8] text-[#7A4E0B]" },
};

export const STATUS_META: Record<ConditionStatus, string> = {
  SUPPORTED: "border-[#1E3A5F] bg-[#E8EEF6] text-[#1E3A5F]",
  UNCERTAIN: "border-[#C2410C] bg-[#FDF0E4] text-[#9A3412]",
  INSUFFICIENT: "border-[#C9CDD3] bg-[#F4F5F7] text-[#4B5563]",
  CONTRADICTED: "border-[#9E3324] bg-[#FBEDEA] text-[#8F2D1F]",
};

export const CONDITION_TYPE_KO: Record<string, string> = {
  EXISTS: "존재",
  MOVE: "이동",
  COUPLE: "결합",
  ATTACH: "설치",
  SUPPORT: "지지",
  FUNCTION: "기능",
  TIMING: "시점",
  TRANSMIT: "전달",
  WOUND: "감김",
};

export const FLAG_KO: Record<string, string> = {
  JUDGE_DISAGREE: "판정자 의견 불일치",
  NO_ALIGNED_ENTITY: "대응 부품 없음",
  NEGATION_CUE: "부정 표현 포함",
  WEAK_ANCHOR: "근거 연결 약함",
};

export const CHECK_KIND_KO: Record<string, string> = {
  CONDITION: "조건 확인",
  ALIGNMENT: "부품 대응",
  DISAGREE: "판정 불일치",
};

/** "internal:모델명(alt)" → 판정자 B */
export function judgeName(judge: string): string {
  return judge.endsWith("(alt)") ? "판정자 B" : "판정자 A";
}

/* ------------------------------------------------------------------ */
/* 가짜 데이터 (백엔드 API 연결 전)                                      */
/* ------------------------------------------------------------------ */

export type CompareScenario = "same" | "check";

interface Scenario {
  label: string;
  request: CompareRequest;
  response: CompareResponse;
  recheck?: CompareResponse;
  sampleAnswers?: AnswerInput[];
}

export const SCENARIOS: Record<CompareScenario, Scenario> = {
  same: {
    label: "SAME 섞인 예 (벨트 방식, 1e 텐션모듈만 확인 필요)",
    request: sameRequest as unknown as CompareRequest,
    response: sameResponse as unknown as CompareResponse,
  },
  check: {
    label: "재판정 예 (랙·피니언 방식, 5행 모두 확인 필요)",
    request: checkRequest as unknown as CompareRequest,
    response: checkResponse as unknown as CompareResponse,
    recheck: recheckResponse as unknown as CompareResponse,
    sampleAnswers: (recheckRequest as unknown as CompareRequest).answers,
  },
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 비교표 조회. TODO: 백엔드 API 확정 후 GET /api/reviews/{reviewId}/comparison 등으로 교체 */
export async function getComparison(scenario: CompareScenario) {
  await delay(400);
  const s = SCENARIOS[scenario];
  return { request: s.request, response: s.response };
}

/** /ai/recheck 요청 본문: 처음 요청 + 현재 부품 대응 + 답변 */
export function buildRecheckRequest(
  request: CompareRequest,
  response: CompareResponse,
  answers: AnswerInput[],
): CompareRequest {
  return { ...request, alignment: response.alignment, answers };
}

/* 재판정 작업 흉내: 실제로는 202 + jobId → GET /api/jobs/{jobId} */
interface MockJob {
  startedAt: number;
  durationMs: number;
  result: CompareResponse;
}
const mockJobs = new Map<string, MockJob>();

export interface RecheckJobState {
  status: "RUNNING" | "DONE" | "FAILED";
  progress: number;
  result?: CompareResponse;
}

/** 재판정 요청. TODO: 백엔드 API 확정 후 실제 호출로 교체 (202 + jobId) */
export async function startRecheck(
  scenario: CompareScenario,
  request: CompareRequest,
  response: CompareResponse,
  answers: AnswerInput[],
): Promise<{ jobId: string }> {
  const body = buildRecheckRequest(request, response, answers);
  console.info("[mock] 재판정 요청 본문", body);
  await delay(300);
  const jobId = `mock-${Date.now()}`;
  mockJobs.set(jobId, {
    startedAt: Date.now(),
    durationMs: 6000,
    result: SCENARIOS[scenario].recheck ?? response,
  });
  return { jobId };
}

/** 재판정 작업 상태. TODO: GET /api/jobs/{jobId} 로 교체 (hooks/useJob 재사용) */
export async function getRecheckJob(jobId: string): Promise<RecheckJobState> {
  const job = mockJobs.get(jobId);
  if (!job) return { status: "FAILED", progress: 0 };
  const ratio = Math.min(1, (Date.now() - job.startedAt) / job.durationMs);
  if (ratio >= 1) return { status: "DONE", progress: 100, result: job.result };
  return { status: "RUNNING", progress: Math.round(ratio * 100) };
}
