/**
 * API 명세서의 공통 형식. 명세서 원본을 받으면 TODO 표시한 부분을 확인해서 맞춘다.
 */

/** 모든 JSON 응답의 래퍼. 실패하면 data는 null이고 message는 사용자에게 보여줄 한글 문장이다. */
export interface ApiResponse<T> {
  message: string;
  data: T | null;
}

/** 비동기 작업 상태. TODO: 실패 상태 이름(FAILED 등)을 명세서에서 확인 */
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

/** GET /jobs/{jobId} 응답 */
export interface Job {
  jobId: string;
  status: JobStatus;
  progress?: number;
  resultUrl?: string;
  errorMessage?: string; // TODO: 필드 이름 확인
}

/** 커서 기반 목록 응답. TODO: 목록 필드 이름(items 등) 확인 */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/** 근거 위치. CLAIM = 청구항 번호, PARAGRAPH = 식별번호(단락). TODO: 타입 값 확인 */
export type CitationType = "CLAIM" | "PARAGRAPH";

export interface Citation {
  type: CitationType;
  ref: string;
}

/** 근거가 붙은 AI 문장 (요약 항목 등) */
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
