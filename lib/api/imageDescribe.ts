/**
 * 도면 업로드 → 기술 설명 초안.
 * POST /images/describe (multipart) → 202 jobId → GET /jobs/{jobId} DONE → resultUrl 조회
 */
import { api } from "./client";
import { API_PATHS } from "./paths";
import { stripApiPrefix } from "./types";

export interface ImageDescribeResult {
  descriptionId: number;
  description: string; // 입력칸에 넣을 초안
  parts: { name: string; role: string }[];
  uncertain: string[]; // 그림만으로 알 수 없는 점 → 사용자에게 보여 주고 설명을 보완하게 함
  width: number;
  height: number;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg"];

/** 업로드 전 검사 (서버 문구와 같게). 문제가 있으면 화면에 띄울 문장을 돌려준다. */
export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "PNG, JPG 파일만 업로드 가능합니다";
  if (file.size > MAX_IMAGE_BYTES) return "이미지는 최대 10MB까지 업로드 가능합니다";
  return null;
}

/** 도면 설명 작업 요청 → jobId. 도면은 서버에 저장되지 않는다. */
export function requestImageDescribe(file: File, hint?: string): Promise<{ jobId: string; status: string }> {
  const form = new FormData();
  form.append("image", file);
  if (hint?.trim()) form.append("hint", hint.trim().slice(0, 2000));
  return api.post<{ jobId: string; status: string }>(API_PATHS.images.describe, form);
}

/** 작업이 끝난 뒤 resultUrl(/api/images/descriptions/{id})로 결과 조회 */
export function getImageDescription(resultUrl: string): Promise<ImageDescribeResult> {
  return api.get<ImageDescribeResult>(stripApiPrefix(resultUrl));
}
