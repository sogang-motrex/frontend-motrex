/**
 * 검토 건 · 비교표 · 재판정 API.
 * 형식은 backend-motrex docs/examples 의 실제 응답과 spec-changes.md 기준.
 */
import type { InputType } from "@/lib/searchDraft";
import { ApiError, api, apiRequestWithStatus } from "./client";
import { API_PATHS } from "./paths";

/* ------------------------------------------------------------------ */
/* 타입                                                                */
/* ------------------------------------------------------------------ */

export type Verdict = "SAME" | "DIFF" | "CHECK";
export type ConditionStatus = "SUPPORTED" | "UNCERTAIN" | "INSUFFICIENT" | "CONTRADICTED";
export type ComparisonStatus = "NONE" | "PENDING" | "RUNNING" | "DONE" | "FAILED" | "STALE";

export interface VerdictSummary {
  same: number;
  check: number;
  diff: number;
}

export interface UserRef {
  userId: number;
  name: string;
}

/** 우리 기술 쪽 근거. DESCRIPTION은 기술 설명 기준, ANSWER는 그 답변 글 기준 위치 */
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
  start: number; // baseClaimText 기준
  end: number;
  status: ConditionStatus;
  statusKo: string;
  evidence: EvidenceFact[];
  votes: Vote[];
  flags: string[];
  questionId: string | null;
}

export interface CompareRow {
  rowId: number;
  elementLabel: string;
  claimText: string;
  start: number; // baseClaimText 기준
  end: number;
  verdict: Verdict; // 검토자가 고쳤으면 고친 값
  label: string; // AI 라벨: 확인 · 부분확인 · 미확인 · 상충
  aiNote: string;
  counterpart: string | null;
  counterpartStatus: "STATED" | "ASSUMED" | "NONE";
  designEvidence: EvidenceFact[];
  conditions: CompareCondition[];
  notices: string[];
  reviewerMemo: string | null;
  edited: boolean;
  editedBy: UserRef | null;
}

export interface CheckItem {
  checkItemId: number; // 질문의 고정 ID (questionId는 재판정 뒤 바뀜)
  content: string;
  checked: boolean;
  questionId: string | null;
  conditionIds: string[];
  kind: string; // CONDITION · ALIGNMENT · DISAGREE · EQUIVALENCE
  answerable: boolean;
  answer: string | null;
  answeredBy: UserRef | null;
  answeredAt: string | null;
}

export interface AlignmentItem {
  claimName: string;
  inputName: string | null;
  status: "STATED" | "ASSUMED" | "NONE";
}

export interface SavedAnswer {
  answerId: number;
  questionId: string | null;
  conditionIds: string[];
  answer: string;
  answeredBy: UserRef | null;
  answeredAt: string;
  checkItemId: number | null;
}

/** GET /reviews/{id}/comparison?patentId= (200) */
export interface Comparison {
  reviewId: number;
  patentId: number;
  status: ComparisonStatus;
  baseClaimNo: string;
  baseClaimText: string;
  verdictSummary: VerdictSummary;
  rows: CompareRow[];
  checkItems: CheckItem[];
  alignment: AlignmentItem[];
  alignmentNotes: string[];
  answers: SavedAnswer[];
  generatedAt: string | null;
  error: string | null;
  /** 판정 모델. route: external = GPT, internal = 사내 Qwen, claude = Claude. 변경 전 비교표는 null, 판정자 1명이면 j2 null */
  judge?: { j1?: JudgeInfo | null; j2?: JudgeInfo | null } | null;
}

export interface JudgeInfo {
  route: "external" | "internal" | "claude" | string;
  model?: string;
}

/**
 * GET /reviews/{id} 응답.
 * TODO: 실제 응답 예시를 받아 필드 이름 확인 (특허 번호·제목·기술 설명 필드)
 */
export interface ReviewPatent {
  patentId: number;
  publicationNumber?: string;
  title?: string;
  comparisonStatus: ComparisonStatus;
  verdictSummary: VerdictSummary | null;
}

export interface ReviewDetail {
  reviewId: number;
  title: string;
  techDescription?: string;
  sensitive: boolean;
  comparisonStatus?: ComparisonStatus;
  staleComparisonCount?: number;
  patents: ReviewPatent[];
}

export interface CreateReviewRequest {
  title?: string;
  techDescription: string;
  searchId?: number;
  patentIds: number[];
  sensitive?: boolean;
  inputType?: InputType;
  /** 도면 설명 결과 ID. 확정한 글은 PUT /reviews/{id}/image-description/confirmed로 따로 보낸다 (imageDescription을 같이 보내면 400) */
  imageDescriptionId?: number;
}

export interface JobAccepted {
  jobId: string;
  status: string;
}

export interface RecheckRequest {
  answers?: { checkItemId: number; answer: string }[];
  alignment?: AlignmentItem[];
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** POST /reviews → 201 { reviewId } */
export function createReview(body: CreateReviewRequest): Promise<{ reviewId: number }> {
  return api.post<{ reviewId: number }>(API_PATHS.reviews.create, body);
}

/** GET /reviews/{id}: 검토 건 상세 (특허 탭, 민감 여부, 기술 설명) */
export function getReview(reviewId: string | number): Promise<ReviewDetail> {
  return api.get<ReviewDetail>(API_PATHS.reviews.detail(reviewId));
}

/** POST /reviews/{id}/comparison: 검토 건의 특허 전부를 한 작업으로 생성 → 202 jobId (재사용이면 바로 DONE) */
export function requestComparison(
  reviewId: string | number,
  baseClaims?: { patentId: number; baseClaimNo: string }[],
): Promise<JobAccepted> {
  return api.post<JobAccepted>(API_PATHS.reviews.comparison(reviewId), baseClaims ? { baseClaims } : undefined);
}

export type ComparisonResult =
  | { state: "READY"; data: Comparison } // 200 (DONE, 또는 FAILED + 이전 행)
  | { state: "GENERATING"; jobId: string } // 202
  | { state: "NONE" } // 404 아직 생성 안 됨
  | { state: "STALE"; message: string }; // 409 다시 생성 필요

/** GET /reviews/{id}/comparison?patentId=: 상태 코드별로 나눠서 돌려준다 */
export async function getComparison(reviewId: string | number, patentId: number): Promise<ComparisonResult> {
  try {
    const res = await apiRequestWithStatus<Comparison | JobAccepted>(API_PATHS.reviews.comparison(reviewId), {
      method: "GET",
      query: { patentId },
    });
    if (res.status === 202) return { state: "GENERATING", jobId: (res.data as JobAccepted).jobId };
    return { state: "READY", data: res.data as Comparison };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { state: "NONE" };
    if (error instanceof ApiError && error.status === 409) return { state: "STALE", message: error.message };
    throw error;
  }
}

/**
 * 검토 건을 민감으로 바꾸기 (올리기만 가능).
 * 외부 경로로 만든 비교표는 다시 생성 필요(STALE)가 되고, 개수(staleComparisonCount)가 온다.
 * TODO: 경로·본문을 백엔드 명세로 확인 (PATCH /reviews/{id} { sensitive: true } 로 가정)
 */
export function markReviewSensitive(reviewId: string | number): Promise<{ staleComparisonCount?: number } | null> {
  return api.patch<{ staleComparisonCount?: number } | null>(API_PATHS.reviews.detail(reviewId), { sensitive: true });
}

/** route → 화면 이름 */
const JUDGE_NAME: Record<string, string> = { external: "GPT", internal: "사내 Qwen", claude: "Claude" };

function judges(judge: Comparison["judge"]): JudgeInfo[] {
  return [judge?.j1, judge?.j2].filter((j): j is JudgeInfo => Boolean(j?.route));
}

/** 외부 모델(GPT·Claude)로 판정했는지 */
export function hasExternalJudge(judge: Comparison["judge"]): boolean {
  return judges(judge).some((j) => j.route !== "internal");
}

/**
 * 판정 모델 표시: "판정: GPT + 사내 Qwen", "판정: Claude + 사내 Qwen", "판정: 사내 Qwen만 (외부 전송 없음)".
 * judge가 null(변경 전 비교표)이면 null → 화면에서 숨김
 */
export function judgeLabel(judge: Comparison["judge"]): string | null {
  const list = judges(judge);
  if (list.length === 0) return null;
  if (!hasExternalJudge(judge)) return "판정: 사내 Qwen만 (외부 전송 없음)";
  const names = Array.from(new Set(list.map((j) => JUDGE_NAME[j.route] ?? j.route)));
  return `판정: ${names.join(" + ")}`;
}

/** 툴팁용 실제 모델 이름 */
export function judgeModels(judge: Comparison["judge"]): string {
  return [judge?.j1 && `판정자 A: ${judge.j1.model ?? judge.j1.route}`, judge?.j2 && `판정자 B: ${judge.j2.model ?? judge.j2.route}`]
    .filter(Boolean)
    .join(" · ");
}

/**
 * 확인한 도면 설명 확정: PUT /reviews/{id}/image-description/confirmed
 * 비교 AI에 보내는 글(사용자 글 + 빈 줄 + 확정 도면 글)은 서버가 합친다.
 */
export function confirmImageDescription(
  reviewId: string | number,
  description: string,
): Promise<ReviewImageDescription> {
  return api.put<ReviewImageDescription>(API_PATHS.reviews.imageDescriptionConfirmed(reviewId), { description });
}

/** GET /reviews/{id}/image-description. 확정 전이면 confirmed가 null이고 status가 DRAFT (초안은 비교에 안 쓰임) */
export interface ReviewImageDescription {
  status: "DRAFT" | "CONFIRMED" | string;
  confirmed: { description: string } | null;
  /** 확정 글에 민감 키워드가 있으면 서버가 민감으로 올림 */
  sensitive?: boolean;
}

/** 검토 건의 확정 도면 글. 도면을 쓰지 않은 검토 건(404)이면 null */
export async function getReviewImageDescription(reviewId: string | number): Promise<ReviewImageDescription | null> {
  try {
    return await api.get<ReviewImageDescription>(API_PATHS.reviews.imageDescription(reviewId));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * 비교 AI가 받은 글을 서버와 똑같이 만든다 (근거 하이라이트 위치가 이 글 기준).
 * 각각 앞뒤 공백을 지우고, 둘 다 있으면 "사용자 글\n\n확정 글", 한쪽만 있으면 그 글만.
 */
export function mergeTechText(userText?: string | null, confirmedText?: string | null): string {
  return [userText?.trim(), confirmedText?.trim()].filter((t): t is string => Boolean(t)).join("\n\n");
}

/** ALIGNMENT 질문에서 청구항 부품 이름 꺼내기: "청구항의 'Y'…" → Y */
export function claimNameOf(content: string): string | null {
  return content.match(/청구항의\s*'([^']+)'/)?.[1] ?? content.match(/'([^']+)'/)?.[1] ?? null;
}

/** POST /reviews/{id}/comparison/{patentId}/recheck → 202 jobId (약 3~4분) */
export function requestRecheck(reviewId: string | number, patentId: number, body: RecheckRequest): Promise<JobAccepted> {
  return api.post<JobAccepted>(API_PATHS.reviews.recheck(reviewId, patentId), body);
}

/* ------------------------------------------------------------------ */
/* 화면 표시용 이름                                                     */
/* ------------------------------------------------------------------ */

export const VERDICT_META: Record<Verdict, { ko: string; className: string }> = {
  SAME: { ko: "유사", className: "bg-[#1E3A5F] text-white" },
  DIFF: { ko: "차이", className: "bg-[#6B7280] text-white" },
  CHECK: { ko: "확인 필요", className: "bg-[#F6E7C8] text-[#7A4E0B]" },
};

export const STATUS_META: Record<ConditionStatus, { ko: string; className: string }> = {
  SUPPORTED: { ko: "확인", className: "border-[#1E3A5F] bg-[#E8EEF6] text-[#1E3A5F]" },
  UNCERTAIN: { ko: "판정 보류", className: "border-[#C2410C] bg-[#FDF0E4] text-[#9A3412]" },
  INSUFFICIENT: { ko: "근거 부족", className: "border-[#C9CDD3] bg-[#F4F5F7] text-[#4B5563]" },
  CONTRADICTED: { ko: "상충", className: "border-[#9E3324] bg-[#FBEDEA] text-[#8F2D1F]" },
};

export const COMPARISON_STATUS_KO: Record<ComparisonStatus, string> = {
  NONE: "생성 전",
  PENDING: "대기 중",
  RUNNING: "생성 중",
  DONE: "완료",
  FAILED: "실패",
  STALE: "다시 생성 필요",
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
  POSITION: "위치",
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
  EQUIVALENCE: "균등 검토",
};

export const ALIGN_STATUS_KO: Record<AlignmentItem["status"], string> = {
  STATED: "이름 같음",
  ASSUMED: "역할 같다고 가정",
  NONE: "대응 없음",
};

/** "internal:모델명(alt)" → 판정자 B */
export function judgeName(judge: string): string {
  return judge.endsWith("(alt)") ? "판정자 B" : "판정자 A";
}

/** 확인 질문이 어느 행의 것인지: 조건 ID로 찾고, 없으면 questionId 앞부분(1e-Q2 → 1e)으로 */
export function rowLabelOf(item: CheckItem, rows: CompareRow[]): string | null {
  for (const row of rows) {
    if (row.conditions.some((c) => item.conditionIds.includes(c.conditionId))) return row.elementLabel;
  }
  return item.questionId?.split("-")[0] ?? null;
}
