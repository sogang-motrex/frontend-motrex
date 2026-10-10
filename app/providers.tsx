"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, reissueAccessToken } from "@/lib/api";

/** 다시 시도해도 결과가 같은 오류(입력 오류, 권한 없음 등)는 자동 재시도하지 않는다. */
const NO_RETRY_STATUS = [400, 401, 403, 404, 409, 413, 422];

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && NO_RETRY_STATUS.includes(error.status)) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  // 새로고침하면 메모리의 accessToken이 사라지므로, 앱 시작 시 한 번 재발급을 시도한다.
  // 로그인하지 않은 상태이거나 백엔드가 꺼져 있으면 조용히 실패한다.
  useEffect(() => {
    void reissueAccessToken();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
