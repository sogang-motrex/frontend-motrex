import Link from "next/link";
import { BlueTag, CitationChip, Tag, UnverifiedChip } from "@/components/common/chips";

const TABS = ["청구항", "상세 설명", "도면", "서지 정보"];

function Lines({ widths, tone = "bg-[#E3E6EA]" }: { widths: number[]; tone?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {widths.map((w, i) => (
        <span key={i} className={`h-2.5 rounded ${tone}`} style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/** SCR-03 특허 상세: 근거가 달린 AI 요약·분류와 원문 뷰어 */
export default async function PatentDetailPage({ params }: { params: Promise<{ patentId: string }> }) {
  const { patentId } = await params; // 나중에 GET /patents/{patentId}, /summary 로 불러온다

  return (
    <div className="flex flex-col gap-6">
      {/* 문헌 헤더 */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E9ED] pb-5">
        <div className="flex flex-col gap-2">
          <Link href="/searches/demo" className="text-sm text-[#1E3A5F] hover:underline">
            ← 검색 결과로
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold">{decodeURIComponent(patentId)}</span>
            <Tag>KR</Tag>
            <Tag>등록</Tag>
            <BlueTag>분류: [현업 기준 A]</BlueTag>
          </div>
          <h1 className="text-2xl font-bold">[특허 제목]</h1>
          <p className="text-sm text-[#4B5563]">[출원인] · 출원 [YYYY.MM.DD] · 등록 [YYYY.MM.DD] · IPC [코드]</p>
        </div>
        <div className="flex gap-2">
          <a href="#" className="rounded-lg border border-[#C9CDD3] bg-white px-4 py-2 text-sm font-semibold">
            원문 보기 ↗
          </a>
          <Link href="/reviews/demo" className="rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-bold text-white">
            비교에 추가
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* 왼쪽: AI 요약 */}
        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-4 rounded-xl border border-[#1E3A5F] bg-[#E8EEF6] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[#1E3A5F]">AI 요약</h2>
              <span className="text-xs text-[#1E3A5F]">모든 문장에 근거 위치 표시</span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">기술 목적</h3>
              <p className="text-sm leading-relaxed">
                [기술 목적 요약 문장]
                <CitationChip label="식별번호 0003" />
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">주요 구성</h3>
              <p className="text-sm leading-relaxed">
                [구성 요소 A], [구성 요소 B], [구성 요소 C]
                <CitationChip label="청구항 1" active />
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">청구항 핵심</h3>
              <p className="text-sm leading-relaxed">
                [독립항 핵심 내용 요약]
                <CitationChip label="청구항 1" />
                <CitationChip label="청구항 4" />
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold">효과</h3>
              <p className="text-sm leading-relaxed">
                [효과 요약 문장]
                <UnverifiedChip />
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-5">
            <h2 className="text-sm font-bold">기술 분류</h2>
            <p className="text-sm">
              <b>[현업 기준 A]</b> · 근거: [분류 판단 근거 문장]
              <CitationChip label="청구항 1" />
            </p>
          </section>

          <section className="flex items-center justify-between rounded-xl border border-[#C9CDD3] bg-white px-5 py-3">
            <span className="text-sm">이 요약이 원문과 맞나요?</span>
            <div className="flex gap-2">
              <button type="button" className="rounded-lg border border-[#C9CDD3] px-3 py-1.5 text-sm hover:bg-[#F4F5F7]">
                정확함
              </button>
              <button type="button" className="rounded-lg border border-[#C9CDD3] px-3 py-1.5 text-sm hover:bg-[#F4F5F7]">
                수정 필요
              </button>
            </div>
          </section>
        </div>

        {/* 오른쪽: 원문 뷰어 */}
        <section className="flex flex-col rounded-xl border border-[#C9CDD3] bg-white">
          <div className="flex border-b border-[#E6E9ED] px-3">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                type="button"
                className={`px-4 py-3 text-sm ${
                  i === 0 ? "border-b-2 border-[#1E3A5F] font-bold text-[#1E3A5F]" : "text-[#4B5563]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4 p-5 text-sm">
            <div className="flex flex-col gap-2 rounded-lg border border-[#C2410C] bg-[#FDE7C8] p-3">
              <span className="text-xs font-bold text-[#9A3412]">청구항 1 · 선택한 근거 위치</span>
              <span>[청구항 1 원문 텍스트]</span>
              <Lines widths={[95, 88, 70]} tone="bg-[#EBC9A0]" />
            </div>
            {[2, 3, 4].map((n) => (
              <div key={n} className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#4B5563]">청구항 {n}</span>
                <Lines widths={[92, 75]} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
