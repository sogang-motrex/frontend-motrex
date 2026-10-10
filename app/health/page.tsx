"use client";

import { useQuery } from "@tanstack/react-query";
import { api, API_PATHS, ApiError } from "@/lib/api";

/**
 * 백엔드 연결 확인용 임시 페이지 (http://localhost:3000/health).
 * GET /api/health 가 성공하면 프론트 → Next 프록시 → Spring Boot 연결이 정상이다.
 */
export default function HealthPage() {
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<unknown>(API_PATHS.health, { skipAuth: true }),
    retry: false,
  });

  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl font-bold">백엔드 연결 확인</h1>

      <div className="mt-6 rounded-lg border p-5">
        {isLoading && <p>확인 중...</p>}
        {!isLoading && !error && (
          <>
            <p className="font-semibold text-green-700">연결됨</p>
            <pre className="mt-3 overflow-x-auto rounded bg-gray-100 p-3 text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </>
        )}
        {error && (
          <>
            <p className="font-semibold text-red-700">연결 실패</p>
            <p className="mt-2 text-sm text-gray-700">
              {error instanceof ApiError
                ? `${error.status} · ${error.message}`
                : "백엔드 서버에 연결할 수 없습니다."}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Spring Boot가 실행 중인지, .env.local의 BACKEND_URL이 맞는지 확인하세요.
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="mt-4 rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        다시 확인
      </button>
    </main>
  );
}
