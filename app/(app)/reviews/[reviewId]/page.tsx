import Link from "next/link";
import { BlueTag, CitationChip } from "@/components/common/chips";
import { MOCK_CLAIM_ROWS, VERDICT_STYLE } from "@/lib/mock/screens";

const OUR_PARTS = ["디스플레이 패널", "모터·기어 구동", "속도 연동 제어", "래칫 고정", "각도 감지 센서"];
const PATENT_TABS = ["KR 10-0000000 B1", "US 0,000,000 B2"];

/** SCR-04 비교 검토: 특허 청구항의 구성요소가 우리 기술에 대응하는지 대조한다. */
export default async function ReviewPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params; // 나중에 GET /reviews/{reviewId}/comparison 으로 불러온다

  const counts = MOCK_CLAIM_ROWS.reduce(
    (acc, row) => ({ ...acc, [row.verdict]: acc[row.verdict] + 1 }),
    { SAME: 0, DIFF: 0, CHECK: 0 },
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-lg border border-[#C9CDD3] bg-[#F1F3F6] px-4 py-3 text-sm">
        <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border border-[#374151] text-xs">
          i
        </span>
        판단은 검토를 돕는 참고 표시이며, 시스템은 특허 침해 여부를 자동으로 판정하지 않습니다.
      </div>

      {/* 검토 대상 기술 */}
      <section className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-5">
        <div className="flex items-center justify-between">
          <h1 className="font-bold">
            검토 대상 기술 <span className="text-sm font-normal text-[#6B7280]">· 검토 ID {reviewId}</span>
          </h1>
          <button type="button" className="rounded-md border border-[#C9CDD3] px-3 py-1 text-xs">
            구성 수정
          </button>
        </div>
        <p className="text-sm text-[#374151]">
          차량 대시보드에 장착된 디스플레이 패널이 차량 속도에 따라 모터로 회전하고, 래칫 기구로 위치를 고정하는 구조
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[#6B7280]">우리 기술의 구성</span>
          {OUR_PARTS.map((p) => (
            <BlueTag key={p}>{p}</BlueTag>
          ))}
        </div>
      </section>

      {/* 비교 특허 탭 + 대비표 */}
      <div>
        <div className="flex gap-1">
          {PATENT_TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              className={`rounded-t-lg border border-b-0 px-4 py-2 font-mono text-sm ${
                i === 0 ? "border-[#C9CDD3] bg-white font-semibold text-[#1E3A5F]" : "border-[#E6E9ED] bg-[#EEF0F3] text-[#4B5563]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <section className="flex flex-col gap-4 rounded-b-xl rounded-tr-xl border border-[#C9CDD3] bg-white p-5">
          <div className="flex flex-wrap items-start gap-4">
            <label className="flex flex-col gap-1 text-xs text-[#4B5563]">
              기준 청구항
              <select className="rounded-lg border border-[#C9CDD3] px-2 py-1.5 text-sm text-[#1F2630]">
                <option>청구항 1 (독립항)</option>
                <option>청구항 7 (독립항)</option>
              </select>
            </label>
            <p className="min-w-0 flex-1 rounded-lg bg-[#F7F8FA] px-4 py-3 text-sm leading-7">
              [청구항 1] 차량 내부에 설치되는 <u>디스플레이 패널</u>
              <sup className="text-[#1E3A5F]">1a</sup>; 상기 패널을 회전시키는 <u>구동부</u>
              <sup className="text-[#1E3A5F]">1b</sup>; <u>사용자 입력에 따라 상기 구동부를 제어하는 제어부</u>
              <sup className="text-[#1E3A5F]">1c</sup>; 및 회전 위치를 유지하는 <u>마찰 힌지</u>
              <sup className="text-[#1E3A5F]">1d</sup>를 포함하는 차량용 디스플레이 장치.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <b>청구항 1 구성요소 {MOCK_CLAIM_ROWS.length}개 중</b>
            <span className="flex h-3 w-72 overflow-hidden rounded-full">
              <span className="bg-[#1E3A5F]" style={{ flex: counts.SAME }} />
              <span className="bg-[#D9A23A]" style={{ flex: counts.CHECK }} />
              <span className="bg-[#C9CDD3]" style={{ flex: counts.DIFF }} />
            </span>
            <span>
              <b className="text-[#1E3A5F]">유사 {counts.SAME}</b> · <b className="text-[#7A4405]">확인 필요 {counts.CHECK}</b> ·{" "}
              <b className="text-[#4B5563]">차이 {counts.DIFF}</b>
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E6E9ED]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#EEF0F3]">
                <tr>
                  <th className="px-3 py-2.5">청구항 구성요소</th>
                  <th className="px-3 py-2.5">특허 청구항 문언</th>
                  <th className="px-3 py-2.5">우리 기술의 대응 구성</th>
                  <th className="px-3 py-2.5">판단</th>
                  <th className="px-3 py-2.5">근거</th>
                  <th className="px-3 py-2.5">검토자 메모</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CLAIM_ROWS.map((row) => (
                  <tr key={row.id} className="border-t border-[#E6E9ED] align-top">
                    <td className="px-3 py-2.5 font-semibold">
                      {row.id} {row.element}
                    </td>
                    <td className="px-3 py-2.5">{row.claimText}</td>
                    <td className="bg-[#F2F6FB] px-3 py-2.5">{row.ours}</td>
                    <td className="px-3 py-2.5">
                      <select
                        defaultValue={row.verdict}
                        aria-label="판단"
                        className={`rounded-md border bg-white px-2 py-1 text-sm ${VERDICT_STYLE[row.verdict].className}`}
                      >
                        <option value="SAME">유사</option>
                        <option value="DIFF">차이</option>
                        <option value="CHECK">확인 필요</option>
                      </select>
                      {row.editedBy && <span className="mt-1 block text-[11px] text-[#4B5563]">수정됨 · {row.editedBy}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {row.refs.map((ref) => (
                          <CitationChip key={ref} label={ref} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        aria-label="메모"
                        defaultValue={row.note}
                        placeholder="메모 입력"
                        className="w-full rounded-md border border-[#C9CDD3] px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_auto]">
        <section className="flex flex-col gap-1.5 rounded-xl border border-dashed border-[#9CA3AF] bg-white p-4">
          <h2 className="text-sm font-bold">
            우리 기술에만 있는 구성 <span className="font-normal text-[#6B7280]">· 참고</span>
          </h2>
          <p className="text-sm text-[#374151]">각도 감지 센서 · 청구항 1에 없는 구성이라 위 대응 여부에는 영향을 주지 않음</p>
        </section>
        <section className="flex flex-col gap-1.5 rounded-xl border border-[#C9CDD3] bg-white p-4">
          <h2 className="text-sm font-bold">
            추가 확인 사항 <span className="font-normal text-[#6B7280]">· AI 제안</span>
          </h2>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" /> 1c의 &apos;사용자 입력&apos;에 차량 속도 같은 자동 신호가 포함되는지 확인
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" /> 1d를 &apos;고정 수단&apos;으로 넓게 해석할 여지가 있는지 확인
          </label>
        </section>
        <div className="flex flex-col justify-end gap-2">
          <button type="button" className="rounded-lg border border-[#C9CDD3] bg-white px-5 py-2.5 text-sm font-semibold">
            임시 저장
          </button>
          <Link
            href={`/reviews/${reviewId}/report`}
            className="rounded-lg bg-[#1E3A5F] px-5 py-2.5 text-center text-sm font-bold text-white"
          >
            보고서 생성 →
          </Link>
        </div>
      </div>
    </div>
  );
}
