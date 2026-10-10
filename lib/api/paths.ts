/**
 * API 경로를 한곳에서 관리한다. 경로가 바뀌면 이 파일만 고친다.
 * 앞에 붙는 /api 는 client.ts에서 자동으로 붙인다.
 * TODO 표시는 공유받은 명세서 요약에 경로가 없어서 임시로 넣은 값이다.
 */
export const API_PATHS = {
  health: "/health",

  auth: {
    login: "/auth/login", // TODO
    signup: "/auth/signup", // TODO
    reissue: "/auth/reissue", // TODO: 토큰 재발급 경로
    logout: "/auth/logout", // TODO
    me: "/users/me",
  },

  jobs: (jobId: string) => `/jobs/${jobId}`,

  search: {
    expand: "/search/expand",
    run: "/search",
    image: "/search/image",
    detail: (searchId: string | number) => `/searches/${searchId}`,
    feedback: (searchId: string | number) => `/searches/${searchId}/feedback`,
  },

  patents: {
    detail: (patentId: string) => `/patents/${patentId}`,
    summary: (patentId: string) => `/patents/${patentId}/summary`,
    summaryStream: (patentId: string) => `/patents/${patentId}/summary/stream`,
    passages: (patentId: string) => `/patents/${patentId}/passages`,
  },

  reviews: {
    list: "/reviews", // TODO
    detail: (reviewId: string | number) => `/reviews/${reviewId}`,
    comparison: (reviewId: string | number) => `/reviews/${reviewId}/comparison`,
    report: (reviewId: string | number) => `/reviews/${reviewId}/report`,
    reportFile: (reviewId: string | number) => `/reviews/${reviewId}/report/file`,
  },
} as const;
