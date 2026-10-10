"use client";

import { useQuery } from "@tanstack/react-query";
import { getJob } from "@/lib/api";

/**
 * 202 + jobId를 받은 작업이 끝날 때까지 상태를 주기적으로 확인한다.
 * DONE이나 FAILED가 되면 자동으로 확인을 멈춘다.
 *
 * 사용 예)
 *   const { data: job } = useJob(jobId);
 *   if (job?.status === "DONE") { 결과 조회 }
 */
export function useJob(jobId: string | null | undefined, intervalMs = 1500) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "DONE" || status === "FAILED" ? false : intervalMs;
    },
  });
}
