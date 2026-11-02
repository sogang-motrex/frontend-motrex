import { api } from "./client";
import { API_PATHS } from "./paths";

/* ------------------------------------------------------------------ */
/* 선택지                                                              */
/* ------------------------------------------------------------------ */

/** 문헌 종류: 백엔드는 5개만 받는다. TODO: 요청 값이 한글인지 코드값인지 명세서로 확인 */
export const KIND_OPTIONS = ["공개", "등록", "실용신안", "재발행", "디자인"] as const;

export const COUNTRY_OPTIONS = ["KR", "US", "EP", "JP", "CN", "DE", "TW"] as const;

export type SearchSort = "RELEVANCE" | "LATEST";

/* ------------------------------------------------------------------ */
/* 요청                                                                */
/* ------------------------------------------------------------------ */

/** 검색 화면(SCR-01)의 입력값 */
export interface SearchFormValues {
  text: string;
  keywords: string[];
  countries: string[];
  kinds: string[];
  applicant: string;
  ipc: string;
}

/**
 * POST /api/search 요청 본문.
 * TODO: query · keywords · filters 안의 필드 이름을 명세서 예시와 대조해 맞추기.
 */
export interface SearchRequest {
  query: string;
  keywords?: string[];
  filters?: {
    countries?: string[];
    kinds?: string[];
    applicants?: string[];
    ipcs?: string[];
  };
  sort?: SearchSort;
  size?: number;
}

/**
 * 화면 입력값을 요청 본문으로 바꾼다.
 * - applicationDateFrom/To: 출원일 데이터가 없어 보내면 400 → 보내지 않음
 * - expression: 직접 수정 미지원이라 값이 있으면 400 → 보내지 않음
 * - 비어 있는 조건은 아예 빼서 "전체"로 검색
 */
export function buildSearchRequest(form: SearchFormValues, sort: SearchSort = "RELEVANCE", size = 20): SearchRequest {
  const filters: NonNullable<SearchRequest["filters"]> = {};
  if (form.countries.length) filters.countries = form.countries;
  if (form.kinds.length) filters.kinds = form.kinds;
  if (form.applicant.trim()) filters.applicants = [form.applicant.trim()];
  if (form.ipc.trim()) filters.ipcs = [form.ipc.trim()];

  return {
    query: form.text.trim(),
    keywords: form.keywords.length ? form.keywords : undefined,
    filters: Object.keys(filters).length ? filters : undefined,
    sort,
    size: Math.min(Math.max(size, 1), 50),
  };
}

/* ------------------------------------------------------------------ */
/* 응답 (백엔드 원본)                                                   */
/* ------------------------------------------------------------------ */

export type MatchType = "CLAIM" | "PARAGRAPH";
export type MatchPath = "KEYWORD" | "SEMANTIC";

/** 하이라이트는 문자 위치({start,end}) 또는 문자열 조각 둘 다 처리한다. TODO: 실제 형식 확인 */
export type RawHighlight = string | { start: number; end: number };

export interface RawMatch {
  type: MatchType;
  ref: string;
  snippet: string;
  highlights?: RawHighlight[];
  path?: MatchPath;
}

export interface RawHit {
  patentId: string | number;
  publicationNumber: string;
  title: string;
  applicant?: string | null;
  kind: string;
  country?: string | null;
  priorityDate?: string | null;
  publicationDate?: string | null;
  score: number;
  category?: string | null;
  thumbnailUrl?: string | null;
  matches?: RawMatch[];
}

/** facets는 [{value, count}] 배열 또는 {값: 개수} 객체 둘 다 처리한다. TODO: 실제 형식 확인 */
type RawFacetList = { value?: string; key?: string; count: number }[] | Record<string, number>;

export interface RawSearchResult {
  searchId: string | number;
  query?: string | null;
  patents?: RawHit[]; // TODO: 목록 필드 이름 확인 (results / items 등)
  facets?: {
    countries?: RawFacetList;
    kinds?: RawFacetList;
    ipc?: RawFacetList;
  };
}

/* ------------------------------------------------------------------ */
/* 화면용 모델                                                          */
/* ------------------------------------------------------------------ */

export interface TextPart {
  text: string;
  hit: boolean;
}

export interface MatchView {
  label: string; // 청구항 1, [0024]
  parts: TextPart[];
  path: MatchPath | null;
}

export interface HitView {
  patentId: string;
  number: string;
  title: string;
  applicant: string | null;
  kind: string;
  country: string | null;
  priorityDate: string | null;
  publicationDate: string | null;
  score: number;
  category: string | null;
  thumbnailUrl: string | null;
  matches: MatchView[];
}

export interface FacetView {
  value: string;
  count: number;
}

export interface SearchResultView {
  searchId: string;
  query: string | null;
  hits: HitView[];
  facets: { countries: FacetView[]; kinds: FacetView[]; ipc: FacetView[] };
}

/* ------------------------------------------------------------------ */
/* 변환 함수                                                            */
/* ------------------------------------------------------------------ */

/** snippet을 하이라이트 조각과 일반 조각으로 나눈다. */
export function splitHighlights(snippet: string, highlights: RawHighlight[] = []): TextPart[] {
  const ranges: [number, number][] = [];

  for (const h of highlights) {
    if (typeof h === "string") {
      if (!h) continue;
      let from = 0;
      let idx = snippet.indexOf(h, from);
      while (idx !== -1) {
        ranges.push([idx, idx + h.length]);
        from = idx + h.length;
        idx = snippet.indexOf(h, from);
      }
    } else if (h && Number.isFinite(h.start) && Number.isFinite(h.end) && h.end > h.start) {
      ranges.push([Math.max(0, h.start), Math.min(snippet.length, h.end)]);
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }

  const parts: TextPart[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push({ text: snippet.slice(cursor, start), hit: false });
    parts.push({ text: snippet.slice(start, end), hit: true });
    cursor = end;
  }
  if (cursor < snippet.length) parts.push({ text: snippet.slice(cursor), hit: false });
  return parts;
}

function matchLabel(type: MatchType, ref: string): string {
  return type === "CLAIM" ? `청구항 ${ref}` : ref;
}

function normalizeFacets(raw?: RawFacetList): FacetView[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw.map((f) => ({ value: String(f.value ?? f.key ?? ""), count: f.count }))
    : Object.entries(raw).map(([value, count]) => ({ value, count }));
  return list.filter((f) => f.value).sort((a, b) => b.count - a.count);
}

export function normalizeSearchResult(raw: RawSearchResult): SearchResultView {
  const hits: HitView[] = (raw.patents ?? []).map((h) => ({
    patentId: String(h.patentId),
    number: h.publicationNumber,
    title: h.title,
    applicant: h.applicant ?? null,
    kind: h.kind,
    country: h.country ?? h.publicationNumber?.slice(0, 2) ?? null,
    priorityDate: h.priorityDate ?? null,
    publicationDate: h.publicationDate ?? null,
    score: typeof h.score === "number" ? h.score : 0,
    category: h.category ?? null,
    thumbnailUrl: h.thumbnailUrl ?? null,
    matches: (h.matches ?? []).map((m) => ({
      label: matchLabel(m.type, m.ref),
      parts: splitHighlights(m.snippet ?? "", m.highlights),
      path: m.path ?? null,
    })),
  }));

  return {
    searchId: String(raw.searchId),
    query: raw.query ?? null,
    hits,
    facets: {
      countries: normalizeFacets(raw.facets?.countries),
      kinds: normalizeFacets(raw.facets?.kinds),
      ipc: normalizeFacets(raw.facets?.ipc),
    },
  };
}

/* ------------------------------------------------------------------ */
/* API 호출                                                            */
/* ------------------------------------------------------------------ */

/** POST /api/search: 검색을 실행하고 searchId를 돌려받는다. 당분간 로그인 없이 호출. */
export async function runSearch(form: SearchFormValues, sort: SearchSort = "RELEVANCE"): Promise<RawSearchResult> {
  return api.post<RawSearchResult>(API_PATHS.search.run, buildSearchRequest(form, sort), { skipAuth: true });
}

/** GET /api/searches/{searchId}: 저장된 결과를 다시 본다 (재검색 안 함). */
export async function getSearch(searchId: string): Promise<SearchResultView> {
  const raw = await api.get<RawSearchResult>(API_PATHS.search.detail(searchId), { skipAuth: true });
  return normalizeSearchResult(raw);
}

export const MATCH_PATH_LABEL: Record<MatchPath, string> = {
  KEYWORD: "키워드 일치",
  SEMANTIC: "의미 유사",
};
