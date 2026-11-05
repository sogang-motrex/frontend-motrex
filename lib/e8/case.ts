/**
 * 정답 사례(E8) 파일 형식. ai-motrex data/e8/*.json 과 같다.
 * 화면에서 고치지 않는 필드도 그대로 보존해서 저장한다.
 */

export type GoldClass = "SUP" | "NOT" | "CON";
export type AlignStatus = "STATED" | "ASSUMED" | "NONE";

export interface E8Alignment {
  claim_name: string;
  input_name: string | null;
  status: AlignStatus;
}

export interface E8Gold {
  claim: string;
  type: string;
  class?: GoldClass | null;
  evidence?: string;
  why?: string;
  delete?: [string, string];
  swap?: [string, string];
  fix?: string;
  negation?: string;
  trap?: string;
  [key: string]: unknown;
}

export interface E8Case {
  case_id: string;
  note?: string;
  claim: { doc_id: string; claim_no: number; element_head: string };
  description: string;
  alignment: E8Alignment[];
  distractors?: string[];
  gold: E8Gold[];
  [key: string]: unknown;
}

export const CLASS_META: Record<GoldClass, { ko: string; hint: string; on: string }> = {
  SUP: { ko: "맞음", hint: "설명에 모든 요소가 명시됨", on: "bg-[#1E3A5F] text-white border-[#1E3A5F]" },
  NOT: { ko: "아님", hint: "빠졌거나 다름, 언급 없음 포함", on: "bg-[#4B5563] text-white border-[#4B5563]" },
  CON: { ko: "반대", hint: "설명이 명시적으로 반대", on: "bg-[#9E3324] text-white border-[#9E3324]" },
};

export const TYPE_OPTIONS: { value: string; ko: string }[] = [
  { value: "EXISTS", ko: "존재" },
  { value: "ATTACH", ko: "설치" },
  { value: "POSITION", ko: "위치" },
  { value: "COUPLE", ko: "결합" },
  { value: "MOVE", ko: "이동" },
  { value: "SUPPORT", ko: "지지" },
  { value: "FUNCTION", ko: "기능" },
  { value: "TIMING", ko: "시점" },
  { value: "TRANSMIT", ko: "전달" },
  { value: "WOUND", ko: "감김" },
];

/** 파일 내용이 사례 형식인지 가볍게 확인 */
export function parseCase(text: string): E8Case {
  const data = JSON.parse(text) as E8Case;
  if (!data || typeof data.description !== "string" || !Array.isArray(data.gold)) {
    throw new Error("정답 사례 파일 형식이 아니에요 (description, gold가 필요해요).");
  }
  data.alignment = Array.isArray(data.alignment) ? data.alignment : [];
  return data;
}

/**
 * e8_run 검사와 같은 기준으로, 저장 전에 문제를 미리 알려 준다.
 * 구절은 설명 속 문구를 정확히 복사해야 한다.
 */
export function checkGold(item: E8Gold, description: string): string[] {
  const problems: string[] = [];
  const has = (s?: string) => !s || description.includes(s);

  if (!item.class) problems.push("정답(SUP/NOT/CON)을 골라 주세요.");
  if (item.class === "SUP" && !item.evidence) problems.push("SUP에는 근거 구절(evidence)이 필요해요.");
  if (!has(item.evidence)) problems.push("근거 구절이 설명에 그대로 있지 않아요.");
  if (item.delete && !has(item.delete[0])) problems.push("delete의 지울 구절이 설명에 없어요.");
  if (item.swap && !has(item.swap[0])) problems.push("swap의 바꿀 구절이 설명에 없어요.");
  if (!has(item.fix)) problems.push("fix 구절이 설명에 없어요.");
  if (!has(item.trap)) problems.push("trap 구절이 설명에 없어요.");
  return problems;
}

/** 검색 파트 전달용 사본: 정답(class)과 정답을 드러내는 이유(why)를 지운다 */
export function toBlind(data: E8Case): E8Case {
  return {
    ...data,
    gold: data.gold.map((g) => {
      const copy = { ...g };
      delete copy.class;
      delete copy.why;
      return copy;
    }),
  };
}

export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([`${JSON.stringify(data, null, 1)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
