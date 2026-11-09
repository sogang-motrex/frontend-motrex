/**
 * 비교 자료 내보내기: GET /reviews/{id}/comparison/file?format=docx|pdf
 * 요청할 때마다 최신 DB 데이터(검토자가 고친 판정·메모 포함)로 파일을 만들고, 서버에는 저장하지 않는다.
 */
import { ApiError } from "./client";
import { API_PATHS } from "./paths";
import { tokenStore } from "./token";

export type ExportFormat = "docx" | "pdf";

/** Content-Disposition에서 파일 이름 꺼내기. 한글 이름(filename*=UTF-8''…)을 먼저 본다 */
function fileNameFrom(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const encoded = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // 디코딩 실패 시 아래로
    }
  }
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : fallback;
}

export async function downloadComparisonFile(reviewId: string | number, format: ExportFormat): Promise<string> {
  const headers = new Headers();
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${API_PATHS.reviews.comparisonFile(reviewId)}?format=${format}`, {
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let message = "비교 자료를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
    try {
      const json = (await res.json()) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      // JSON이 아닌 오류 응답
    }
    throw new ApiError(res.status, message);
  }

  const fileName = fileNameFrom(res.headers.get("Content-Disposition"), `비교자료.${format}`);
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return fileName;
}
