import type { ReactNode } from "react";

/** 근거 위치 칩 (청구항 1, 식별번호 0003 등). 나중에 클릭 시 원문 위치로 이동하도록 연결한다. */
export function CitationChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`ml-1 inline-flex items-center rounded border border-[#1E3A5F] px-1.5 py-px align-middle text-xs ${
        active ? "bg-[#1E3A5F] text-white" : "bg-white text-[#1E3A5F] hover:bg-[#E8EEF6]"
      }`}
    >
      {label}
    </button>
  );
}

/** 원문에서 근거를 찾지 못한 AI 문장 표시 */
export function UnverifiedChip() {
  return (
    <span className="ml-1 inline-flex rounded border border-[#A15C07] bg-[#FBEBD0] px-1.5 py-px align-middle text-xs text-[#7A4405]">
      미확인 · 근거 문장 없음
    </span>
  );
}

/** 회색 태그 (국가, 문헌 종류, 키워드 등) */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="rounded bg-[#EEF0F3] px-2 py-0.5 text-xs text-[#374151]">{children}</span>;
}

/** 파란 태그 (AI 결과, 분류 등) */
export function BlueTag({ children }: { children: ReactNode }) {
  return <span className="rounded bg-[#E8EEF6] px-2 py-0.5 text-xs text-[#1E3A5F]">{children}</span>;
}
