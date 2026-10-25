/**
 * 화면 개발용 가짜 데이터. 백엔드 API를 연결하면 이 파일 대신 API 응답을 쓴다.
 * 내용은 모두 가상의 예시다.
 */

export const MOCK_QUERY = {
  text: "차량 대시보드에 장착된 디스플레이 패널이 차량 속도에 따라 모터로 회전하고, 래칫 기구로 위치를 고정하는 구조",
  keywords: ["회전 디스플레이", "구동 모터"],
  expansions: ["틸팅 패널", "각도 가변 표시장치", "rotatable display", "IPC B60K 35/00 (예시)"],
  countries: ["KR", "US", "EP", "JP", "CN", "DE", "TW"],
  docTypes: ["특허 공개", "특허 등록", "실용 공개", "실용 등록", "재발행", "디자인"],
};

export interface MockSnippetPart {
  text: string;
  hit?: boolean;
}

export interface MockResult {
  id: string;
  number: string;
  kind: string;
  applicant: string;
  filedAt: string;
  title: string;
  relevance: number;
  snippet: MockSnippetPart[];
  snippetRef: string;
  matchedBy: string[];
}

export const MOCK_RESULTS: MockResult[] = [
  {
    id: "KR10-0000000",
    number: "KR 10-0000000 B1",
    kind: "등록",
    applicant: "[출원인]",
    filedAt: "[YYYY.MM.DD]",
    title: "[특허 제목]",
    relevance: 0.88,
    snippet: [
      { text: "… 상기 디스플레이 " },
      { text: "패널", hit: true },
      { text: "을 " },
      { text: "회전", hit: true },
      { text: "시키는 " },
      { text: "구동부", hit: true },
      { text: "와, 차량의 주행 상태에 따라 …" },
    ],
    snippetRef: "청구항 1",
    matchedBy: ["키워드 일치", "의미 유사"],
  },
  {
    id: "US0000000B2",
    number: "US 0,000,000 B2",
    kind: "등록",
    applicant: "[출원인]",
    filedAt: "[YYYY.MM.DD]",
    title: "[특허 제목]",
    relevance: 0.76,
    snippet: [
      { text: "… a " },
      { text: "tilting", hit: true },
      { text: " mechanism configured to adjust an angle of the " },
      { text: "display", hit: true },
      { text: " …" },
    ],
    snippetRef: "0024",
    matchedBy: ["의미 유사", "도면 유사"],
  },
  {
    id: "JP0000000000A",
    number: "JP 0000-000000 A",
    kind: "공개",
    applicant: "[출원인]",
    filedAt: "[YYYY.MM.DD]",
    title: "[특허 제목]",
    relevance: 0.64,
    snippet: [{ text: "… [매칭된 문장] …" }],
    snippetRef: "0011",
    matchedBy: ["의미 유사"],
  },
];

export type MockVerdict = "SAME" | "DIFF" | "CHECK";

export const MOCK_CLAIM_ROWS: {
  id: string;
  element: string;
  claimText: string;
  ours: string;
  verdict: MockVerdict;
  refs: string[];
  note?: string;
  editedBy?: string;
}[] = [
  { id: "1a", element: "디스플레이 패널", claimText: "차량 내부에 설치되는 디스플레이 패널", ours: "대시보드 디스플레이 패널", verdict: "SAME", refs: ["청구항 1"] },
  { id: "1b", element: "구동부", claimText: "상기 패널을 회전시키는 구동부", ours: "모터·기어 회전 구동", verdict: "SAME", refs: ["청구항 1", "0021"] },
  { id: "1c", element: "제어부", claimText: "사용자 입력에 따라 구동부를 제어", ours: "차량 속도에 연동해 자동 제어", verdict: "CHECK", refs: ["청구항 1", "0031"] },
  {
    id: "1d",
    element: "고정 수단",
    claimText: "회전 위치를 유지하는 마찰 힌지",
    ours: "래칫 기구 (마찰 힌지 아님)",
    verdict: "DIFF",
    refs: ["청구항 1", "0040"],
    note: "래칫과 마찰 힌지는 다른 방식",
    editedBy: "[이름]",
  },
];

export const VERDICT_STYLE: Record<MockVerdict, { label: string; className: string }> = {
  SAME: { label: "유사", className: "border-[#1E3A5F] text-[#1E3A5F]" },
  DIFF: { label: "차이", className: "border-[#C9CDD3] text-[#4B5563]" },
  CHECK: { label: "확인 필요", className: "border-[#A15C07] text-[#7A4405]" },
};

export const MOCK_HISTORY = [
  { id: "demo", title: "차량용 회전 디스플레이 구조", patents: 2, updatedAt: "[YYYY.MM.DD]", status: "비교 검토 중" },
  { id: "demo2", title: "[검토 제목]", patents: 3, updatedAt: "[YYYY.MM.DD]", status: "보고서 완료" },
];
