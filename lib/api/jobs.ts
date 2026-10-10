import { api } from "./client";
import { API_PATHS } from "./paths";
import type { Job } from "./types";

/** GET /jobs/{jobId}: 요약·비교표·보고서·평가 같은 비동기 작업의 진행 상태 */
export function getJob(jobId: string): Promise<Job> {
  return api.get<Job>(API_PATHS.jobs(jobId));
}
