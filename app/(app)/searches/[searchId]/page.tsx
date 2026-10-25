import Link from "next/link";
import { Tag } from "@/components/common/chips";
import { MOCK_RESULTS } from "@/lib/mock/screens";

const FILTERS = [
  { title: "국가", items: ["KR", "US", "EP", "JP · CN 외"] },
  { title: "문헌 종류", items: ["특허 등록", "특허 공개", "실용신안"] },
  { title: "IPC", items: ["[IPC 코드]", "[IPC 코드]"] },
];

/** SCR-02 검색 결과: 관련 특허 후보와 매칭 근거를 보여주고 비교할 특허를 고른다. */
export default async function SearchResultPage({ params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params; // 나중에 GET /searches/{searchId} 로 결과를 불러온다

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* 검색 요약 */}
      <section className="flex items-center justify-between gap-6 rounded-xl border border-[#C9CDD3] bg-white px-5 py-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="truncate text-sm">
            차량 대시보드에 장착된 디스플레이 패널이 차량 속도에 따라 모터로 회전하고, 래칫 기구로 위치를 고정하는 구조
          </p>
          <div className="flex flex-wrap gap-2">
            <Tag>회전 디스플레이</Tag>
            <Tag>틸팅 패널</Tag>
            <Tag>KR·US·EP·JP·CN</Tag>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="text-sm text-[#4B5563]">
            결과 <b className="text-[#1F2630]">[N]</b>건 · 검색 ID {searchId}
          </span>
          <Link href="/search" className="rounded-lg border border-[#C9CDD3] px-4 py-2 text-sm font-semibold hover:bg-[#F4F5F7]">
            조건 수정
          </Link>
        </div>
      </section>

      <div className="flex gap-6">
        {/* 필터 */}
        <aside className="hidden w-56 shrink-0 flex-col gap-5 self-start rounded-xl border border-[#E6E9ED] bg-white p-4 text-sm md:flex">
          {FILTERS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <span className="font-bold">{group.title}</span>
              {group.items.map((item, i) => (
                <label key={`${item}-${i}`} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <input type="checkbox" /> {item}
                  </span>
                  <span className="text-[#6B7280]">[n]</span>
                </label>
              ))}
            </div>
          ))}
        </aside>

        {/* 결과 목록 */}
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#4B5563]">관련도 높은 순</span>
            <label className="flex items-center gap-2 text-sm text-[#4B5563]">
              정렬
              <select className="rounded-lg border border-[#C9CDD3] bg-white px-2 py-1.5">
                <option>관련도순</option>
                <option>최신순</option>
              </select>
            </label>
          </div>

          {MOCK_RESULTS.map((r, i) => (
            <article
              key={r.id}
              className={`flex gap-4 rounded-xl border bg-white p-4 ${i < 2 ? "border-2 border-[#1E3A5F]" : "border-[#C9CDD3]"}`}
            >
              <input type="checkbox" aria-label="비교 대상 선택" defaultChecked={i < 2} className="mt-1 h-5 w-5 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm font-semibold">{r.number}</span>
                  <Tag>{r.kind}</Tag>
                  <span className="text-sm text-[#4B5563]">
                    {r.applicant} · 출원 {r.filedAt}
                  </span>
                  <span className="ml-auto flex items-center gap-2 text-xs text-[#4B5563]">
                    관련도
                    <span className="flex h-2 w-24 overflow-hidden rounded bg-[#E6E9ED]">
                      <span className="bg-[#1E3A5F]" style={{ width: `${r.relevance * 100}%` }} />
                    </span>
                  </span>
                </div>
                <Link href={`/patents/${r.id}`} className="w-fit text-base font-bold hover:underline">
                  {r.title}
                </Link>
                <div className="flex flex-col gap-2 rounded-lg bg-[#F7F8FA] p-3">
                  <p className="text-sm leading-relaxed text-[#374151]">
                    {r.snippet.map((part, idx) =>
                      part.hit ? (
                        <mark key={idx} className="bg-[#FDE7C8]">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={idx}>{part.text}</span>
                      ),
                    )}{" "}
                    <span className="text-[#6B7280]">[{r.snippetRef}]</span>
                  </p>
                  <div className="flex gap-1.5">
                    {r.matchedBy.map((m) => (
                      <span key={m} className="rounded border border-[#1E3A5F] px-1.5 text-xs text-[#1E3A5F]">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#9CA3AF] bg-[#E3E6EA] text-xs text-[#4B5563]">
                대표 도면
              </div>
            </article>
          ))}
        </section>
      </div>

      {/* 비교 검토 시작 바 */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#2B3646] bg-[#1E2633]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <span className="text-sm text-[#F4F5F7]">
            <b>2건</b> 선택됨 · 비교는 최대 5건
          </span>
          <Link href="/reviews/demo" className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[#1E2633]">
            비교 검토 시작 →
          </Link>
        </div>
      </div>
    </div>
  );
}
