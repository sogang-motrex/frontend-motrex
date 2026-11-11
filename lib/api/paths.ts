/**
 * API 경로를 한곳에서 관리한다. 앞에 붙는 /api 는 client.ts에서 자동으로 붙인다.
 */
export const API_PATHS = {
  health: "/health",

  auth: {
    login: "/auth/login", // TODO
    signup: "/auth/signup", // TODO
    reissue: "/auth/reissue", // TODO
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

  images: {
    describe: "/images/describe", // POST multipart → 202 jobId
  },

  patents: {
    detail: (patentId: string | number) => `/patents/${patentId}`,
    summary: (patentId: string | number) => `/patents/${patentId}/summary`,
    summaryStream: (patentId: string | number) => `/patents/${patentId}/summary/stream`,
    passages: (patentId: string | number) => `/patents/${patentId}/passages`,
  },

  reviews: {
    list: "/reviews",
    create: "/reviews",
    detail: (reviewId: string | number) => `/reviews/${reviewId}`,
    /** POST: 비교표 생성(검토 건의 특허 전부), GET ?patentId=: 특허 한 건의 비교표 */
    comparison: (reviewId: string | number) => `/reviews/${reviewId}/comparison`,
    /** PATCH: 기준 청구항 변경 */
    baseClaim: (reviewId: string | number, patentId: string | number) => `/reviews/${reviewId}/comparison/${patentId}`,
    /** GET: 검토 건의 도면 설명 (status, confirmed.description) */
    imageDescription: (reviewId: string | number) => `/reviews/${reviewId}/image-description`,
    /** PUT { description }: 확인한 도면 설명 확정 */
    imageDescriptionConfirmed: (reviewId: string | number) => `/reviews/${reviewId}/image-description/confirmed`,
    /** GET ?format=docx|pdf: 비교 자료 파일 (변리사 의뢰용) */
    comparisonFile: (reviewId: string | number) => `/reviews/${reviewId}/comparison/file`,
    recheck: (reviewId: string | number, patentId: string | number) =>
      `/reviews/${reviewId}/comparison/${patentId}/recheck`,
    row: (reviewId: string | number, rowId: number) => `/reviews/${reviewId}/comparison/rows/${rowId}`,
    checkItem: (reviewId: string | number, checkItemId: number) =>
      `/reviews/${reviewId}/comparison/check-items/${checkItemId}`,
    report: (reviewId: string | number) => `/reviews/${reviewId}/report`,
    reportFile: (reviewId: string | number) => `/reviews/${reviewId}/report/file`,
  },
} as const;
