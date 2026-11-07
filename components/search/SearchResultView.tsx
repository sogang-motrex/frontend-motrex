"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Tag } from "@/components/common/chips";
import { ApiError } from "@/lib/api";
import { createReview, requestComparison } from "@/lib/api/compare";
import { getSearch, MATCH_PATH_LABEL, type FacetView, type HitView, type SearchSort } from "@/lib/api/search";
import { loadSearchDraft } from "@/lib/searchDraft";

const MAX_COMPARE = 5;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FacetGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: FacetView[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold">{title}</span>
      {items.map((f) => (
        <label key={f.value} className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <input type="checkbox" checked={selected.includes(f.value)} onChange={() => onToggle(f.value)} />
            <span className="truncate">{f.value}</span>
          </span>
          <span className="text-[#6B7280]">{f.count}</span>
        </label>
      ))}
    </div>
  );
}

function ResultCard({
  hit,
  checked,
  disabled,
  onToggle,
}: {
  hit: HitView;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const dates = [
    hit.priorityDate && `우선일 ${hit.priorityDate}`,
    hit.publicationDate && `공개일 ${hit.publicationDate}`,
  ].filter(Boolean);

  return (
    <article
      className={`flex gap-4 rounded-xl border bg-white p-4 ${checked ? "border-2 border-[#1E3A5F]" : "border-[#C9CDD3]"}`}
    >
      <input
        type="checkbox"
        aria-label={`${hit.number} 비교 대상 선택`}
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="mt-1 h-5 w-5 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-sm font-semibold">{hit.number}</span>
          <Tag>{hit.kind}</Tag>
          {hit.category && <Tag>{hit.category}</Tag>}
          <span className="text-sm text-[#4B5563]">{[hit.applicant ?? "출원인 정보 없음", ...dates].join(" · ")}</span>
          <span className="ml-auto flex items-center gap-2 text-xs text-[#4B5563]">
            관련도 {Math.round(hit.score * 100)}
            <span className="flex h-2 w-24 overflow-hidden rounded bg-[#E6E9ED]">
              <span className="bg-[#1E3A5F]" style={{ width: `${Math.round(hit.score * 100)}%` }} />
            </span>
          </span>
        </div>

        <Link href={`/patents/${encodeURIComponent(hit.patentId)}`} className="w-fit text-base font-bold hover:underline">
          {hit.title}
        </Link>

        {hit.matches.slice(0, 2).map((m, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg bg-[#F7F8FA] p-3">
            <p className="text-sm leading-relaxed text-[#374151]">
              {m.parts.map((p, idx) =>
                p.hit ? (
                  <mark key={idx} className="bg-[#FDE7C8]">
                    {p.text}
                  </mark>
                ) : (
                  <span key={idx}>{p.text}</span>
                ),
              )}{" "}
              <span className="text-[#6B7280]">[{m.label}]</span>
            </p>
            {m.path && (
              <span className="w-fit rounded border border-[#1E3A5F] px-1.5 text-xs text-[#1E3A5F]">
                {MATCH_PATH_LABEL[m.path]}
              </span>
            )}
          </div>
        ))}
      </div>

      {hit.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hit.thumbnailUrl} alt={`${hit.number} 대표 도면`} className="h-24 w-24 shrink-0 rounded-lg border object-contain" />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#C9CDD3] bg-[#F7F8FA] text-xs text-[#6B7280]">
          도면 없음
        </div>
      )}
    </article>
  );
}

/** SCR-02 검색 결과: 저장된 검색 결과를 불러와 필터·정렬하고 비교할 특허를 고른다. */
export default function SearchResultView({ searchId }: { searchId: string }) {
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["search", searchId],
    queryFn: () => getSearch(searchId),
  });

  const [countries, setCountries] = useState<string[]>([]);
  const [kinds, setKinds] = useState<string[]>([]);
  const [sort, setSort] = useState<SearchSort>("RELEVANCE");
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  // 비교 검토 시작: 검토 건 만들기 → 비교표 생성 요청 → 비교 검토 화면으로 이동
  const startReview = useMutation({
    mutationFn: async () => {
      const draft = loadSearchDraft(searchId);
      const techDescription = (draft?.techDescription || data?.query || "").trim().slice(0, 2000);
      const numericSearchId = Number(searchId);
      const { reviewId } = await createReview({
        techDescription,
        searchId: Number.isFinite(numericSearchId) ? numericSearchId : undefined,
        patentIds: selected.map(Number),
        sensitive: draft?.sensitive ?? false,
        inputType: draft?.inputType ?? "TEXT",
        imageDescription: draft?.imageDescription ?? undefined,
      });
      const job = await requestComparison(reviewId);
      return { reviewId, jobId: job.status === "DONE" ? null : job.jobId };
    },
    onSuccess: ({ reviewId, jobId }) => router.push(jobId ? `/reviews/${reviewId}?jobId=${jobId}` : `/reviews/${reviewId}`),
  });

  // facets는 반환된 결과 안에서 센 값이므로, 필터도 받은 결과 안에서 적용한다.
  const visibleHits = useMemo(() => {
    const hits = (data?.hits ?? []).filter(
      (h) => (!countries.length || (h.country && countries.includes(h.country))) && (!kinds.length || kinds.includes(h.kind)),
    );
    if (sort === "LATEST") {
      return [...hits].sort((a, b) => (b.publicationDate ?? "").localeCompare(a.publicationDate ?? ""));
    }
    return [...hits].sort((a, b) => b.score - a.score);
  }, [data, countries, kinds, sort]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-[#E6E9ED] bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    const status = error instanceof ApiError ? error.status : 0;
    const message = error instanceof ApiError ? error.message : "결과를 불러오지 못했습니다.";
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-[#C9CDD3] bg-white p-8">
        <p className="font-bold">{message}</p>
        <div className="flex gap-2">
          {status === 503 && (
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-lg border border-[#C9CDD3] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              다시 시도
            </button>
          )}
          <Link href="/search" className="rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-bold text-white">
            새로 검색하기
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <section className="flex items-center justify-between gap-6 rounded-xl border border-[#C9CDD3] bg-white px-5 py-4">
        <p className="min-w-0 truncate text-sm">{data.query ?? "검색 결과"}</p>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-sm text-[#4B5563]">
            결과 <b className="text-[#1F2630]">{data.hits.length}</b>건
          </span>
          <Link href="/search" className="rounded-lg border border-[#C9CDD3] px-4 py-2 text-sm font-semibold hover:bg-[#F4F5F7]">
            새로 검색
          </Link>
        </div>
      </section>

      <div className="flex gap-6">
        <aside className="hidden w-56 shrink-0 flex-col gap-5 self-start rounded-xl border border-[#E6E9ED] bg-white p-4 text-sm md:flex">
          <FacetGroup
            title="국가"
            items={data.facets.countries}
            selected={countries}
            onToggle={(v) => setCountries(toggle(countries, v))}
          />
          <FacetGroup title="문헌 종류" items={data.facets.kinds} selected={kinds} onToggle={(v) => setKinds(toggle(kinds, v))} />
          {data.facets.ipc.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-bold">IPC</span>
              {data.facets.ipc.slice(0, 8).map((f) => (
                <div key={f.value} className="flex justify-between gap-2">
                  <span className="truncate">{f.value}</span>
                  <span className="text-[#6B7280]">{f.count}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-[#6B7280]">개수는 이번 검색 결과 안에서 센 값입니다.</p>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#4B5563]">{visibleHits.length}건 표시</span>
            <label className="flex items-center gap-2 text-sm text-[#4B5563]">
              정렬
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SearchSort)}
                className="rounded-lg border border-[#C9CDD3] bg-white px-2 py-1.5"
              >
                <option value="RELEVANCE">관련도순</option>
                <option value="LATEST">최신순 (공개일)</option>
              </select>
            </label>
          </div>

          {visibleHits.length === 0 && (
            <div className="rounded-xl border border-[#C9CDD3] bg-white p-8 text-center text-sm text-[#4B5563]">
              조건에 맞는 특허가 없습니다.
            </div>
          )}

          {visibleHits.map((hit) => {
            const checked = selected.includes(hit.patentId);
            return (
              <ResultCard
                key={hit.patentId}
                hit={hit}
                checked={checked}
                disabled={!checked && selected.length >= MAX_COMPARE}
                onToggle={() => setSelected(toggle(selected, hit.patentId))}
              />
            );
          })}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#2B3646] bg-[#1E2633]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <span className="text-sm text-[#F4F5F7]">
            <b>{selected.length}건</b> 선택됨 · 비교는 최대 {MAX_COMPARE}건
            {startReview.error && (
              <span className="ml-3 text-[#F6B4A8]">
                {startReview.error instanceof ApiError ? startReview.error.message : "검토 건을 만들지 못했습니다."}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => startReview.mutate()}
            disabled={selected.length === 0 || startReview.isPending}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#1E2633] disabled:opacity-40"
          >
            {startReview.isPending ? "검토 건 만드는 중…" : "비교 검토 시작 →"}
          </button>
        </div>
      </div>
    </div>
  );
}
