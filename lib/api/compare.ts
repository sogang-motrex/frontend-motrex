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
  imageDescription?: string;
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
