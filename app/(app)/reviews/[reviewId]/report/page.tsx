import Link from "next/link";

const TOC = ["1. 검토 개요", "2. 검색 조건", "3. 관련 특허 목록", "4. 구성요소 비교", "5. 추가 확인 사항", "6. 원문 링크"];

function Lines({ widths }: { widths: number[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {widths.map((w, i) => (
        <span key={i} className="h-2 rounded bg-[#E3E6EA]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/** SCR-05 보고서: 현업 양식 보고서 미리보기, 직접 수정, Word·PDF 내보내기 */
export default async function ReportPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params; // 나중에 GET /reviews/{reviewId}/report 로 불러온다

  return (
    <div className="flex flex-col gap-5">
      {/* 도구 모음 */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href={`/reviews/${reviewId}`} className="text-sm text-[#1E3A5F] hover:underline">
            ← 비교 검토로
          </Link>
          <label className="flex items-center gap-2 text-sm text-[#4B5563]">
            보고서 양식
            <select className="rounded-lg border border-[#C9CDD3] bg-white px-2 py-1.5 text-[#1F2630]">
              <option>[모트렉스 제공 양식]</option>
              <option>기본 양식</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          {["링크 복사", "Word 내보내기", "PDF 내보내기"].map((label) => (
            <button key={label} type="button" className="rounded-lg border border-[#C9CDD3] bg-white px-3.5 py-2 text-sm hover:bg-[#F4F5F7]">
              {label}
            </button>
          ))}
          <button type="button" className="rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-bold text-white">
            검토 이력에 저장
          </button>
        </div>
      </section>

      <div className="flex gap-6">
        {/* 목차 */}
        <nav className="hidden w-52 shrink-0 flex-col gap-3 self-start rounded-xl border border-[#E6E9ED] bg-white p-4 text-sm md:flex">
          <span className="font-bold">목차</span>
          {TOC.map((item, i) => (
            <a key={item} href="#" className={i === 0 ? "font-semibold text-[#1E3A5F]" : "text-[#374151] hover:text-[#1E3A5F]"}>
              {item}
            </a>
          ))}
        </nav>

        {/* 문서 미리보기 */}
        <section className="flex flex-1 justify-center rounded-xl bg-[#E9ECEF] p-6">
          <article className="flex w-full max-w-3xl flex-col gap-6 rounded bg-white px-12 py-10 shadow-sm">
            <header className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-bold">특허 검토 보고서 (초안)</h1>
              <p className="text-xs text-[#6B7280]">AI 생성 초안 · 최종 판단은 검토자 확인 필요</p>
            </header>

            <div className="grid grid-cols-[110px_1fr_110px_1fr] border border-[#D5D9DF] text-sm">
              <span className="bg-[#EEF0F3] px-3 py-2 font-semibold">검토 대상</span>
              <span className="px-3 py-2">차량용 회전 디스플레이 구조</span>
              <span className="bg-[#EEF0F3] px-3 py-2 font-semibold">검토일</span>
              <span className="px-3 py-2">[YYYY.MM.DD]</span>
              <span className="border-t border-[#D5D9DF] bg-[#EEF0F3] px-3 py-2 font-semibold">검토자</span>
              <span className="border-t border-[#D5D9DF] px-3 py-2">[이름]</span>
              <span className="border-t border-[#D5D9DF] bg-[#EEF0F3] px-3 py-2 font-semibold">비교 특허</span>
              <span className="border-t border-[#D5D9DF] px-3 py-2">2건</span>
            </div>

            <section className="flex flex-col gap-2 rounded outline-dashed outline-[1.5px] outline-offset-8 outline-[#9DB3CF]">
              <div className="flex justify-between">
                <h2 className="font-bold">1. 검토 개요</h2>
                <span className="text-xs text-[#1E3A5F]">클릭해서 직접 수정</span>
              </div>
              <Lines widths={[100, 94, 62]} />
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-bold">3. 관련 특허 목록</h2>
              <table className="w-full border border-[#D5D9DF] text-left text-sm">
                <thead className="bg-[#EEF0F3]">
                  <tr>
                    <th className="px-2 py-1.5">No</th>
                    <th className="px-2 py-1.5">문헌번호</th>
                    <th className="px-2 py-1.5">제목</th>
                    <th className="px-2 py-1.5">검토 결과</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#D5D9DF]">
                    <td className="px-2 py-1.5">1</td>
                    <td className="px-2 py-1.5 font-mono text-xs">KR 10-0000000</td>
                    <td className="px-2 py-1.5">[특허 제목]</td>
                    <td className="px-2 py-1.5">유사 2 · 확인 1 · 차이 1</td>
                  </tr>
                  <tr className="border-t border-[#D5D9DF]">
                    <td className="px-2 py-1.5">2</td>
                    <td className="px-2 py-1.5 font-mono text-xs">US 0,000,000</td>
                    <td className="px-2 py-1.5">[특허 제목]</td>
                    <td className="px-2 py-1.5">유사 3 · 차이 1</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-bold">4. 구성요소 비교</h2>
              <Lines widths={[100, 86]} />
            </section>

            <section className="flex flex-col gap-1.5 text-sm">
              <h2 className="text-base font-bold">6. 원문 링크</h2>
              <a href="#" className="text-[#1E3A5F] underline">
                KR 10-0000000 B1 · [공식 원문 주소]
              </a>
              <a href="#" className="text-[#1E3A5F] underline">
                US 0,000,000 B2 · [공식 원문 주소]
              </a>
            </section>
          </article>
        </section>
      </div>
    </div>
  );
}
