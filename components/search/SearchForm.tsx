"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import ImageDescribe from "@/components/search/ImageDescribe";
import { ApiError } from "@/lib/api";
import { COUNTRY_OPTIONS, KIND_OPTIONS, runSearch, type SearchFormValues } from "@/lib/api/search";

const EMPTY_FORM: SearchFormValues = {
  text: "",
  keywords: [],
  countries: [],
  kinds: [],
  applicant: "",
  ipc: "",
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** SCR-01 검색 입력: 입력값으로 POST /api/search 를 호출하고 결과 화면으로 이동한다. */
export default function SearchForm() {
  const router = useRouter();
  const [form, setForm] = useState<SearchFormValues>(EMPTY_FORM);
  const [keywordInput, setKeywordInput] = useState("");

  const search = useMutation({
    mutationFn: () => runSearch(form),
    onSuccess: (data) => router.push(`/searches/${data.searchId}`),
  });

  const canSubmit = (form.text.trim().length > 0 || form.keywords.length > 0) && !search.isPending;

  const addKeyword = () => {
    const word = keywordInput.trim();
    if (word && !form.keywords.includes(word)) setForm({ ...form, keywords: [...form.keywords, word] });
    setKeywordInput("");
  };

  const onKeywordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      addKeyword();
    }
  };

  /** 화면 표시용 검색식. 백엔드가 직접 수정을 지원하지 않아 요청에는 보내지 않는다. */
  const expressionPreview = useMemo(() => {
    const parts: string[] = [];
    if (form.text.trim()) parts.push(`"${form.text.trim().slice(0, 30)}${form.text.trim().length > 30 ? "…" : ""}"`);
    if (form.keywords.length) parts.push(`(${form.keywords.map((k) => `"${k}"`).join(" OR ")})`);
    if (form.countries.length) parts.push(`국가:(${form.countries.join(", ")})`);
    if (form.kinds.length) parts.push(`종류:(${form.kinds.join(", ")})`);
    if (form.applicant.trim()) parts.push(`출원인:(${form.applicant.trim()})`);
    if (form.ipc.trim()) parts.push(`IPC:(${form.ipc.trim()})`);
    return parts.length ? parts.join(" AND ") : "입력하면 검색식이 표시됩니다";
  }, [form]);

  const errorMessage =
    search.error instanceof ApiError
      ? search.error.message
      : search.error
        ? "검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
        : null;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) search.mutate();
      }}
    >
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
              maxLength={2000}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="resize-none rounded-lg border border-[#C9CDD3] p-3 text-sm outline-none focus:border-[#1E3A5F]"
              placeholder="예) 차량 대시보드에 장착된 디스플레이 패널이 모터로 회전하며 각도를 조절하는 구조"
            />
            <span className="self-end text-xs text-[#6B7280]">{form.text.length} / 2,000자</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="kw" className="text-sm font-semibold">
              키워드
            </label>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#C9CDD3] px-3 py-2">
              {form.keywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, keywords: form.keywords.filter((w) => w !== k) })}
                  className="rounded bg-[#EEF0F3] px-2 py-1 text-sm hover:bg-[#E3E6EA]"
                  aria-label={`${k} 삭제`}
                >
                  {k} ×
                </button>
              ))}
              <input
                id="kw"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={onKeywordKeyDown}
                onBlur={addKeyword}
                className="min-w-32 flex-1 text-sm outline-none"
                placeholder="키워드 입력 후 Enter"
              />
            </div>
            <div className="rounded-lg border border-dashed border-[#9DB3CF] bg-[#F2F6FB] p-3 text-sm text-[#4B5563]">
              AI 추천 확장 용어 · 용어 확장 API 연결 후 제공 예정
            </div>
          </div>

          <ImageDescribe currentText={form.text} onApply={(text) => setForm((f) => ({ ...f, text: text.slice(0, 2000) }))} />
        </section>

        {/* 오른쪽: 검색 조건 */}
        <section className="flex h-fit flex-col gap-5 rounded-xl border border-[#C9CDD3] bg-white p-6">
          <div>
            <h2 className="font-bold">검색 조건</h2>
            <p className="mt-1 text-xs text-[#6B7280]">선택하지 않으면 전체에서 검색합니다.</p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-[#374151]">국가</legend>
            <div className="grid grid-cols-4 gap-2 text-sm">
              {COUNTRY_OPTIONS.map((c) => (
                <label key={c} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.countries.includes(c)}
                    onChange={() => setForm({ ...form, countries: toggle(form.countries, c) })}
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-[#374151]">문헌 종류</legend>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {KIND_OPTIONS.map((k) => (
                <label key={k} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.kinds.includes(k)}
                    onChange={() => setForm({ ...form, kinds: toggle(form.kinds, k) })}
                  />
                  {k}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="applicant" className="text-sm font-semibold text-[#374151]">
              출원인
            </label>
            <input
              id="applicant"
              value={form.applicant}
              onChange={(e) => setForm({ ...form, applicant: e.target.value })}
              className="rounded-lg border border-[#C9CDD3] px-3 py-2 text-sm"
              placeholder="예) 현대자동차"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ipc" className="text-sm font-semibold text-[#374151]">
              IPC / CPC
            </label>
            <input
              id="ipc"
              value={form.ipc}
              onChange={(e) => setForm({ ...form, ipc: e.target.value })}
              className="rounded-lg border border-[#C9CDD3] px-3 py-2 text-sm"
              placeholder="예) B60R"
            />
          </div>

          <p className="rounded-lg bg-[#F7F8FA] px-3 py-2 text-xs text-[#6B7280]">
            출원 기간 필터는 데이터 기준(우선일·공개일)이 정해지면 추가됩니다.
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-semibold">
          검색식 미리보기 <span className="font-normal text-[#6B7280]">· 직접 수정은 준비 중</span>
        </span>
        <div className="overflow-x-auto rounded-lg bg-[#1E2633] px-4 py-3 font-mono text-sm text-[#E5E9EF]">
          {expressionPreview}
        </div>
      </section>

      {errorMessage && (
        <p role="alert" className="rounded-lg border border-[#E7B4AC] bg-[#FBEDEA] px-4 py-3 text-sm text-[#8F2D1F]">
          {errorMessage}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setKeywordInput("");
            search.reset();
          }}
          className="rounded-lg border border-[#C9CDD3] bg-white px-6 py-3 text-sm font-semibold"
        >
          초기화
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-[#1E3A5F] px-10 py-3 text-sm font-bold text-white hover:bg-[#16304F] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {search.isPending ? "검색 중…" : "특허 검색"}
        </button>
      </div>
    </form>
  );
}
