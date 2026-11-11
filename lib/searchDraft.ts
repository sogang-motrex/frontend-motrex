/**
 * 검색할 때 입력한 내용을 검색 번호별로 잠시 보관한다.
 * 검색 결과 화면에서 "비교 검토 시작"으로 검토 건을 만들 때 기술 설명·민감 여부·도면 설명이 필요하기 때문.
 * 브라우저 탭을 닫으면 사라진다.
 */
export type InputType = "TEXT" | "IMAGE" | "MIXED";

export interface SearchDraft {
  /** 사용자가 직접 쓴 글만 (비어도 됨) */
  techDescription: string;
  inputType: InputType;
  /** 도면 설명 결과 ID와 사용자가 확인한 도면 글 */
  imageDescriptionId: number | null;
  imageDescription: string | null;
  sensitive: boolean;
}

const key = (searchId: string | number) => `search-draft:${searchId}`;

export function saveSearchDraft(searchId: string | number, draft: SearchDraft): void {
  try {
    sessionStorage.setItem(key(searchId), JSON.stringify(draft));
  } catch {
    // 저장 실패는 무시 (검토 건 생성 때 검색어로 대신함)
  }
}

export function loadSearchDraft(searchId: string | number): SearchDraft | null {
  try {
    const raw = sessionStorage.getItem(key(searchId));
    return raw ? (JSON.parse(raw) as SearchDraft) : null;
  } catch {
    return null;
  }
}
