/**
 * API 공통 형식. 백엔드 실제 응답(backend-motrex docs/examples, spec-changes.md) 기준.
 */

/** 모든 JSON 응답의 래퍼. 실패하면 data는 null이고 message는 사용자에게 보여줄 한글 문장이다. */
export interface ApiResponse<T> {
  message: string;
  data: T | null;
}

/** 비동기 작업 상태 */
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

/** GET /jobs/{jobId} 응답 */
export interface Job {
  jobId: string;
  type?: string; // COMPARISON · RECHECK · IMAGE_DESCRIBE 등
  status: JobStatus;
  progress: number; // 0~100 (재판정은 0 → 100으로 한 번에 바뀜)
  resultUrl: string | null; // DONE일 때만. "/api/..." 형태
  error: string | null; // FAILED일 때만. 화면에 그대로 보여도 되는 문구
}

/** 커서 기반 목록 응답 (검토 목록은 목록 이름이 reviews) */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export type CitationType = "CLAIM" | "PARAGRAPH";

export interface Citation {
  type: CitationType;
  ref: string;
}

export interface CitedText {
  text: string;
  citations: Citation[];
}

/** 비교표 판단 값. 침해 여부는 판정하지 않는다. */
export type Verdict = "SAME" | "DIFF" | "CHECK";

export const VERDICT_LABEL: Record<Verdict, string> = {
  SAME: "유사",
  DIFF: "차이",
  CHECK: "확인 필요",
};

/** resultUrl("/api/...")을 공통 요청 함수용 경로("/...")로 바꾼다 */
export function stripApiPrefix(url: string): string {
  return url.replace(/^\/api(?=\/)/, "");
}
