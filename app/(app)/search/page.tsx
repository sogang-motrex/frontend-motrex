import Link from "next/link";
import { MOCK_QUERY } from "@/lib/mock/screens";

/** SCR-01 검색 입력: 기술 설명·키워드·도면과 검색 조건을 입력한다. */
export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">새 검토 시작</h1>
        <p className="mt-1 text-sm text-[#4B5563]">검토할 기술을 설명하면 관련 특허를 찾아 드립니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* 왼쪽: 입력 */}
        <section className="flex flex-col gap-6 rounded-xl border border-[#C9CDD3] bg-white p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="desc" className="text-sm font-semibold">
              기술 설명
            </label>
            <textarea
              id="desc"
              rows={6}
              defaultValue={MOCK_QUERY.text}
              className="resize-none rounded-lg border border-[#C9CDD3] p-3 text-sm outline-none focus:border-[#1E3A5F]"
              placeholder="검토할 기술을 자연어로 설명하세요."
            />
            <span className="self-end text-xs text-[#6B7280]">{MOCK_QUERY.text.length} / 2,000자</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="kw" className="text-sm font-semibold">
              키워드
            </label>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#C9CDD3] px-3 py-2">
              {MOCK_QUERY.keywords.map((k) => (
                <span key={k} className="rounded bg-[#EEF0F3] px-2 py-1 text-sm">
                  {k} ×
                </span>
              ))}
              <input id="kw" className="min-w-32 flex-1 text-sm outline-none" placeholder="키워드 입력 후 Enter" />
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-[#1E3A5F] bg-[#E8EEF6] p-3">
              <span className="text-sm font-semibold text-[#1E3A5F]">AI 추천 확장 용어 · 클릭하면 검색에 추가</span>
              <div className="flex flex-wrap gap-2">
                {MOCK_QUERY.expansions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="rounded border border-[#9DB3CF] bg-white px-2.5 py-1 text-sm text-[#1E3A5F] hover:bg-[#F2F6FB]"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">도면 이미지 (선택)</span>
            <label className="flex h-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-[#9CA3AF] bg-[#F7F8FA] text-sm text-[#4B5563] hover:bg-[#F1F3F6]">
              도면 이미지를 끌어다 놓거나 클릭해서 업로드 (PNG·JPG, 최대 10MB)
              <input type="file" accept="image/png,image/jpeg" className="hidden" />
            </label>
          </div>
        </section>

        {/* 오른쪽: 검색 조건 */}
        <section className="flex h-fit flex-col gap-5 rounded-xl border border-[#C9CDD3] bg-white p-6">
          <h2 className="font-bold">검색 조건</h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-[#374151]">국가</legend>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {MOCK_QUERY.countries.map((c, i) => (
                <label key={c} className="flex items-center gap-1.5">
                  <input type="checkbox" defaultChecked={i < 5} /> {c}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-[#374151]">문헌 종류</legend>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {MOCK_QUERY.docTypes.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input type="checkbox" defaultChecked={i < 4} /> {d}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="applicant" className="text-sm font-semibold text-[#374151]">
              출원인
            </label>
            <input id="applicant" className="rounded-lg border border-[#C9CDD3] px-3 py-2 text-sm" placeholder="예) OOO 주식회사" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ipc" className="text-sm font-semibold text-[#374151]">
              IPC / CPC
            </label>
            <input id="ipc" className="rounded-lg border border-[#C9CDD3] px-3 py-2 text-sm" placeholder="예) B60K" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[#374151]">출원 기간</span>
            <div className="flex items-center gap-2 text-sm">
              <input type="date" aria-label="시작일" className="min-w-0 flex-1 rounded-lg border border-[#C9CDD3] px-3 py-2" />
              <span>~</span>
              <input type="date" aria-label="종료일" className="min-w-0 flex-1 rounded-lg border border-[#C9CDD3] px-3 py-2" />
            </div>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-semibold">
          검색식 미리보기 <span className="font-normal text-[#6B7280]">· 직접 수정 가능</span>
        </span>
        <div className="overflow-x-auto rounded-lg bg-[#1E2633] px-4 py-3 font-mono text-sm text-[#E5E9EF]">
          (&quot;회전 디스플레이&quot; OR &quot;틸팅 패널&quot;) AND &quot;구동 모터&quot; AND 국가:(KR, US, EP, JP, CN)
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <button type="reset" className="rounded-lg border border-[#C9CDD3] bg-white px-6 py-3 text-sm font-semibold">
          초기화
        </button>
        <Link href="/searches/demo" className="rounded-lg bg-[#1E3A5F] px-10 py-3 text-sm font-bold text-white hover:bg-[#16304F]">
          특허 검색
        </Link>
      </div>
    </div>
  );
}
