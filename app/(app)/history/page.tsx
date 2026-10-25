import Link from "next/link";
import { MOCK_HISTORY } from "@/lib/mock/screens";

/** 검토 이력 (화면설계서 추가 예정). 저장한 검토 건을 다시 연다. */
export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">검토 이력</h1>
      <div className="overflow-hidden rounded-xl border border-[#C9CDD3] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#EEF0F3]">
            <tr>
              <th className="px-4 py-3">검토 제목</th>
              <th className="px-4 py-3">비교 특허</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">수정일</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_HISTORY.map((h) => (
              <tr key={h.id} className="border-t border-[#E6E9ED] hover:bg-[#F7F8FA]">
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/reviews/${h.id}`} className="hover:underline">
                    {h.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{h.patents}건</td>
                <td className="px-4 py-3">{h.status}</td>
                <td className="px-4 py-3 text-[#4B5563]">{h.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
