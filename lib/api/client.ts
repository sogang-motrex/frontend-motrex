import { API_PATHS } from "./paths";
import { tokenStore } from "./token";
import type { ApiResponse } from "./types";

const API_BASE = "/api";

/** 백엔드가 실패 응답을 보냈을 때 던지는 에러. message는 화면에 그대로 보여줘도 되는 한글 문장이다. */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** 객체를 넘기면 JSON으로, FormData를 넘기면 multipart로 보낸다. */
  body?: unknown;
  /** ?cursor=...&size=20 같은 쿼리 파라미터. undefined·null은 빠진다. */
  query?: Record<string, QueryValue>;
  /** 로그인·토큰 재발급처럼 Authorization 헤더가 필요 없는 요청 */
  skipAuth?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseJson(res: Response): Promise<ApiResponse<unknown> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiResponse<unknown>;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * refreshToken 쿠키로 accessToken을 다시 받는다.
 * 여러 요청이 동시에 401을 받아도 재발급 요청은 한 번만 보낸다.
 */
export function reissueAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(buildUrl(API_PATHS.auth.reissue), {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          tokenStore.clear();
          return null;
        }
        const json = (await parseJson(res)) as ApiResponse<{ accessToken: string }> | null;
        const token = json?.data?.accessToken ?? null; // TODO: 응답 필드 이름 확인
        tokenStore.set(token);
        return token;
      } catch {
        tokenStore.clear();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { body, query, skipAuth, headers, ...init } = options;
  const finalHeaders = new Headers(headers);
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isForm) finalHeaders.set("Content-Type", "application/json");

  const token = tokenStore.get();
  if (token && !skipAuth) finalHeaders.set("Authorization", `Bearer ${token}`);

  return fetch(buildUrl(path, query), {
    ...init,
    headers: finalHeaders,
    credentials: "include",
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
}

/**
 * 상태 코드까지 필요한 요청에 쓴다.
 * 예) 요약 조회: 200이면 결과, 202면 jobId를 받아 useJob으로 기다린다.
 */
export async function apiRequestWithStatus<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ status: number; data: T; message: string }> {
  let res = await send(path, options);

  if (res.status === 401 && !options.skipAuth) {
    const newToken = await reissueAccessToken();
    if (newToken) res = await send(path, options);
  }

  const json = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.message ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      json,
    );
  }
  return { status: res.status, data: (json?.data ?? null) as T, message: json?.message ?? "" };
}

/** 대부분의 요청은 이걸 쓴다. 응답 래퍼에서 data만 꺼내 돌려준다. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await apiRequestWithStatus<T>(path, options);
  return data;
}

type NoMethod = Omit<RequestOptions, "method" | "body">;

export const api = {
  get: <T>(path: string, options?: NoMethod) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: NoMethod) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: NoMethod) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: NoMethod) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: NoMethod) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};

/**
 * 보고서 Word·PDF처럼 JSON이 아닌 파일을 내려받는다.
 * 예) await downloadFile(API_PATHS.reviews.reportFile(12), { format: "docx" }, "report.docx")
 */
export async function downloadFile(
  path: string,
  query: Record<string, QueryValue>,
  fallbackName: string,
): Promise<void> {
  let res = await send(path, { method: "GET", query });
  if (res.status === 401) {
    const newToken = await reissueAccessToken();
    if (newToken) res = await send(path, { method: "GET", query });
  }
  if (!res.ok) {
    const json = await parseJson(res);
    throw new ApiError(res.status, json?.message ?? "파일을 내려받지 못했습니다.", json);
  }

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const fileName = match ? decodeURIComponent(match[1]) : fallbackName;

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
