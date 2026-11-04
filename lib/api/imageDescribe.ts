/**
 * 도면 업로드 → 기술 설명 초안.
 * 형식은 AI 서버 /ai/image-describe 실제 응답(ai-motrex docs/examples)과 같다.
 */
import sample from "@/lib/mock/compare/image_describe_response.json";

export interface ImageDescribeResult {
  description: string;
  parts: { name: string; role: string }[];
  uncertain: string[]; // 그림만으로 알 수 없는 점 → 사용자에게 보여주고 설명을 보완하게 함
  width: number;
  height: number;
  promptVersion: string;
  cached: boolean;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/jpeg"];

/** 업로드 전 검사. 문제가 있으면 화면에 띄울 문장을 돌려준다. */
export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "PNG 또는 JPG 이미지만 올릴 수 있어요.";
  if (file.size > MAX_IMAGE_BYTES) return "10MB 이하 이미지만 올릴 수 있어요.";
  return null;
}

/**
 * 도면 설명 요청.
 * TODO: 백엔드 API가 정해지면 아래처럼 교체 (파일 필드 이름은 명세 확인)
 *   const form = new FormData();
 *   form.append("image", file);
 *   return api.post<ImageDescribeResult>("경로", form, { skipAuth: true });
 */
export async function describeImage(file: File): Promise<ImageDescribeResult> {
  void file;
  await new Promise((resolve) => setTimeout(resolve, 2500));
  return sample as ImageDescribeResult;
}
