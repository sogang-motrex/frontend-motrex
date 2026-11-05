"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import HighlightText, { type HighlightRange } from "@/components/compare/HighlightText";
import {
  CLASS_META,
  TYPE_OPTIONS,
  checkGold,
  downloadJson,
  parseCase,
  toBlind,
  type AlignStatus,
  type E8Case,
  type E8Gold,
  type GoldClass,
} from "@/lib/e8/case";
import sample01 from "@/lib/mock/e8/tension-01.json";
import sample02 from "@/lib/mock/e8/tension-02.json";

interface LoadedCase {
  fileName: string;
  data: E8Case;
  dirty: boolean;
}

const SAMPLES: LoadedCase[] = [
  { fileName: "tension-01.json", data: sample01 as unknown as E8Case, dirty: false },
  { fileName: "tension-02.json", data: sample02 as unknown as E8Case, dirty: false },
];

const CLASSES: GoldClass[] = ["SUP", "NOT", "CON"];

function rangeOf(text: string, phrase: string | undefined, tone: HighlightRange["tone"]): HighlightRange[] {
  if (!phrase) return [];
  const start = text.indexOf(phrase);
  return start === -1 ? [] : [{ start, end: start + phrase.length, tone }];
}

/* ------------------------------------------------------------------ */
/* 조건 하나                                                            */
/* ------------------------------------------------------------------ */

function GoldItem({
  index,
  item,
  description,
  selected,
  picked,
  onSelect,
  onChange,
  onRemove,
}: {
  index: number;
  item: E8Gold;
  description: string;
  selected: boolean;
  picked: string;
  onSelect: () => void;
  onChange: (patch: Partial<E8Gold>) => void;
  onRemove: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const problems = checkGold(item, description);

  /** 빈 값이면 필드를 지워서 원래 파일처럼 깔끔하게 저장 */
  const setText = (key: "evidence" | "why" | "fix" | "negation" | "trap", value: string) =>
    onChange({ [key]: value === "" ? undefined : value });
  const setPair = (key: "delete" | "swap", pos: 0 | 1, value: string) => {
    const pair: [string, string] = [...((item[key] as [string, string] | undefined) ?? ["", ""])] as [string, string];
    pair[pos] = value;
    onChange({ [key]: pair[0] === "" && pair[1] === "" ? undefined : pair });
  };

  return (
    <li
      onClick={onSelect}
      className={`flex flex-col gap-3 rounded-xl bg-white p-4 ${selected ? "border-2 border-[#1E3A5F]" : "border border-[#C9CDD3]"}`}
    >
      <div className="flex items-start gap-3">
        <span className="font-mono text-sm font-bold text-[#1E3A5F]">{index + 1}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={item.claim}
            onChange={(e) => onChange({ claim: e.target.value })}
            className="rounded-md border border-[#E6E9ED] px-2 py-1 text-sm font-semibold"
            aria-label="조건 문구 (청구항에서 복사)"
          />
          <select
            value={item.type}
            onChange={(e) => onChange({ type: e.target.value })}
            className="w-fit rounded-md border border-[#E6E9ED] px-2 py-1 text-xs"
            aria-label="조건 유형"
          >
            {!TYPE_OPTIONS.some((t) => t.value === item.type) && <option value={item.type}>{item.type}</option>}
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.ko} ({t.value})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-xs text-[#6B7280] hover:text-[#9E3324]"
        >
          삭제
        </button>
      </div>

      <div className="flex gap-2">
        {CLASSES.map((c, i) => (
          <button
            key={c}
            type="button"
            title={`${CLASS_META[c].hint} (단축키 ${i + 1})`}
            onClick={() => onChange({ class: item.class === c ? undefined : c })}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold ${
              item.class === c ? CLASS_META[c].on : "border-[#C9CDD3] bg-white text-[#374151] hover:bg-[#F4F5F7]"
            }`}
          >
            {c} <span className="font-normal">{CLASS_META[c].ko}</span>
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-xs text-[#4B5563]">
        근거 구절 (evidence · 설명에서 그대로 복사)
        <div className="flex gap-2">
          <input
            value={item.evidence ?? ""}
            onChange={(e) => setText("evidence", e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-[#E6E9ED] px-2 py-1 text-sm text-[#1F2630]"
          />
          <button
            type="button"
            disabled={!picked}
            onClick={() => setText("evidence", picked)}
            className="shrink-0 rounded-md border border-[#9DB3CF] px-2 text-xs text-[#1E3A5F] disabled:opacity-40"
          >
            선택한 구절 넣기
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1 text-xs text-[#4B5563]">
        이유 (why · 정답이 애매했다면 한 줄)
        <input
          value={item.why ?? ""}
          onChange={(e) => setText("why", e.target.value)}
          className="rounded-md border border-[#E6E9ED] px-2 py-1 text-sm text-[#1F2630]"
        />
      </label>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="w-fit text-xs font-semibold text-[#1E3A5F]"
      >
        {showAdvanced ? "▲" : "▼"} 변형용 구절 (delete · swap · fix · negation · trap)
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#F7F8FA] p-3 text-xs text-[#4B5563]">
          {(["delete", "swap"] as const).map((key) => (
            <div key={key} className="col-span-2 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                {key === "delete" ? "delete: 지울 구절" : "swap: 바꿀 구절"}
                <input
                  value={(item[key] as [string, string] | undefined)?.[0] ?? ""}
                  onChange={(e) => setPair(key, 0, e.target.value)}
                  className="rounded-md border border-[#E6E9ED] bg-white px-2 py-1 text-sm text-[#1F2630]"
                />
              </label>
              <label className="flex flex-col gap-1">
                {key === "delete" ? "대신 넣을 말 (비우면 삭제)" : "바뀐 구절"}
                <input
                  value={(item[key] as [string, string] | undefined)?.[1] ?? ""}
                  onChange={(e) => setPair(key, 1, e.target.value)}
                  className="rounded-md border border-[#E6E9ED] bg-white px-2 py-1 text-sm text-[#1F2630]"
                />
              </label>
            </div>
          ))}
          {(["fix", "negation", "trap"] as const).map((key) => (
            <label key={key} className="col-span-2 flex flex-col gap-1">
              {key === "fix"
                ? "fix: 상대 부품이 달라 NOT일 때 그 구절"
                : key === "negation"
                  ? "negation: 명시적 부정 문장"
                  : "trap: 인용 함정 구절"}
              <input
                value={(item[key] as string | undefined) ?? ""}
                onChange={(e) => setText(key, e.target.value)}
                className="rounded-md border border-[#E6E9ED] bg-white px-2 py-1 text-sm text-[#1F2630]"
              />
            </label>
          ))}
        </div>
      )}

      {problems.length > 0 && (
        <ul className="flex flex-col gap-0.5 rounded-md bg-[#FDF0E4] px-3 py-2 text-xs text-[#9A3412]">
          {problems.map((p) => (
            <li key={p}>· {p}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* 화면 전체                                                            */
/* ------------------------------------------------------------------ */

/** 정답 주석 화면: 사례 파일을 열어 조건마다 SUP/NOT/CON을 고르고 JSON으로 저장 */
export default function AnnotateView() {
  const [cases, setCases] = useState<LoadedCase[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(0);
  const [picked, setPicked] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const active = cases[current] ?? null;
  const data = active?.data ?? null;

  const updateCase = useCallback(
    (fn: (d: E8Case) => E8Case) =>
      setCases((list) => list.map((c, i) => (i === current ? { ...c, data: fn(c.data), dirty: true } : c))),
    [current],
  );

  const updateGold = useCallback(
    (index: number, patch: Partial<E8Gold>) =>
      updateCase((d) => ({
        ...d,
        gold: d.gold.map((g, i) => {
          if (i !== index) return g;
          const next: E8Gold = { ...g, ...patch };
          for (const key of Object.keys(patch)) if (next[key] === undefined) delete next[key];
          return next;
        }),
      })),
    [updateCase],
  );

  // 키보드: 1·2·3 = SUP·NOT·CON, ↑↓ = 조건 이동 (입력칸에 있을 때는 동작 안 함)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (!data || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (["1", "2", "3"].includes(e.key)) {
        const cls = CLASSES[Number(e.key) - 1];
        updateGold(selected, { class: data.gold[selected]?.class === cls ? undefined : cls });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, data.gold.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, selected, updateGold]);

  const openFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = "";
    const loaded: LoadedCase[] = [];
    for (const file of files) {
      try {
        loaded.push({ fileName: file.name, data: parseCase(await file.text()), dirty: false });
        setLoadError(null);
      } catch (err) {
        setLoadError(`${file.name}: ${err instanceof Error ? err.message : "읽을 수 없는 파일이에요."}`);
      }
    }
    if (loaded.length) {
      setCases((list) => [...list, ...loaded]);
      setCurrent(cases.length);
      setSelected(0);
    }
  };

  const ranges = useMemo<HighlightRange[]>(() => {
    if (!data) return [];
    const others = data.gold.flatMap((g, i) => (i === selected ? [] : rangeOf(data.description, g.evidence, "row")));
    const item = data.gold[selected];
    return [
      ...others,
      ...rangeOf(data.description, item?.trap, "evidence"),
      ...rangeOf(data.description, item?.evidence, "focus"),
    ];
  }, [data, selected]);

  const done = data ? data.gold.filter((g) => g.class).length : 0;
  const problemCount = data ? data.gold.filter((g) => checkGold(g, data.description).length > 0).length : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">정답 주석</h1>
          <p className="mt-1 text-sm text-[#4B5563]">
            사례 파일(data/e8/*.json)을 열어 조건마다 정답을 고르고 저장해요. 단축키: 1 SUP · 2 NOT · 3 CON · ↑↓ 이동
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-bold text-white">
            사례 파일 열기
            <input type="file" accept=".json,application/json" multiple className="hidden" onChange={openFiles} />
          </label>
          <button
            type="button"
            onClick={() => {
              setCases((list) => [...list, ...SAMPLES]);
              setCurrent(cases.length);
              setSelected(0);
            }}
            className="rounded-lg border border-[#C9CDD3] bg-white px-4 py-2 text-sm font-semibold"
          >
            예시 불러오기
          </button>
        </div>
      </section>

      {loadError && <p className="rounded-lg bg-[#FBEDEA] px-4 py-2 text-sm text-[#8F2D1F]">{loadError}</p>}

      {!data ? (
        <div className="rounded-xl border border-dashed border-[#9CA3AF] bg-white p-10 text-center text-sm text-[#4B5563]">
          사례 파일을 열거나 예시를 불러오세요. 여러 파일을 한 번에 열 수 있어요.
        </div>
      ) : (
        <>
          {/* 열린 파일 탭 */}
          <div className="flex flex-wrap gap-1">
            {cases.map((c, i) => (
              <button
                key={`${c.fileName}-${i}`}
                type="button"
                onClick={() => {
                  setCurrent(i);
                  setSelected(0);
                }}
                className={`rounded-t-lg border border-b-0 px-3 py-1.5 font-mono text-xs ${
                  i === current ? "border-[#C9CDD3] bg-white font-bold text-[#1E3A5F]" : "border-[#E6E9ED] bg-[#EEF0F3] text-[#4B5563]"
                }`}
              >
                {c.fileName}
                {c.dirty && " ●"}
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
            {/* 왼쪽: 사례 정보 */}
            <section className="flex flex-col gap-4 self-start lg:sticky lg:top-20">
              <div className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-4">
                <p className="text-xs text-[#6B7280]">
                  {data.case_id} · {data.claim.doc_id} 청구항 {data.claim.claim_no} · 구성요소 머리말{" "}
                  <b className="text-[#1F2630]">{data.claim.element_head}</b>
                </p>
                {data.note && <p className="text-xs leading-relaxed text-[#4B5563]">{data.note}</p>}
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-4">
                <h2 className="flex items-center justify-between text-sm font-bold">
                  가상 제품 설명
                  <span className="text-xs font-normal text-[#6B7280]">드래그로 구절을 선택하면 근거로 넣을 수 있어요</span>
                </h2>
                <div
                  onMouseUp={() => {
                    const text = window.getSelection()?.toString().trim() ?? "";
                    setPicked(text && data.description.includes(text) ? text : "");
                  }}
                >
                  <HighlightText text={data.description} ranges={ranges} />
                </div>
                {picked && (
                  <p className="rounded-md bg-[#E8EEF6] px-2 py-1 text-xs text-[#1E3A5F]">선택한 구절: {picked}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-4">
                <h2 className="text-sm font-bold">부품 대응표</h2>
                <table className="w-full text-left text-xs">
                  <thead className="text-[#6B7280]">
                    <tr>
                      <th className="py-1">청구항 부품</th>
                      <th className="py-1">제품 부품</th>
                      <th className="py-1">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.alignment.map((a, i) => (
                      <tr key={i} className="border-t border-[#F1F3F6]">
                        <td className="py-1 pr-2">{a.claim_name}</td>
                        <td className="py-1 pr-2">
                          <input
                            value={a.input_name ?? ""}
                            placeholder="없음"
                            onChange={(e) =>
                              updateCase((d) => ({
                                ...d,
                                alignment: d.alignment.map((x, j) =>
                                  j === i ? { ...x, input_name: e.target.value || null } : x,
                                ),
                              }))
                            }
                            className="w-full rounded border border-[#E6E9ED] px-1.5 py-0.5"
                          />
                        </td>
                        <td className="py-1">
                          <select
                            value={a.status}
                            onChange={(e) =>
                              updateCase((d) => ({
                                ...d,
                                alignment: d.alignment.map((x, j) =>
                                  j === i ? { ...x, status: e.target.value as AlignStatus } : x,
                                ),
                              }))
                            }
                            className="rounded border border-[#E6E9ED] px-1 py-0.5"
                          >
                            <option value="STATED">STATED 이름 같음</option>
                            <option value="ASSUMED">ASSUMED 역할 같다고 가정</option>
                            <option value="NONE">NONE 대응 없음</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 오른쪽: 조건별 정답 */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  정답 단 조건 <b>{done}</b> / {data.gold.length}
                  {problemCount > 0 && <span className="ml-2 text-[#9A3412]">확인 필요 {problemCount}개</span>}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateCase((d) => ({ ...d, gold: [...d.gold, { claim: "", type: "EXISTS" }] }))
                  }
                  className="rounded-md border border-[#C9CDD3] bg-white px-3 py-1 text-xs font-semibold"
                >
                  + 조건 추가
                </button>
              </div>
              <ul className="flex flex-col gap-3">
                {data.gold.map((g, i) => (
                  <GoldItem
                    key={i}
                    index={i}
                    item={g}
                    description={data.description}
                    selected={i === selected}
                    picked={picked}
                    onSelect={() => setSelected(i)}
                    onChange={(patch) => updateGold(i, patch)}
                    onRemove={() => {
                      updateCase((d) => ({ ...d, gold: d.gold.filter((_, j) => j !== i) }));
                      setSelected(0);
                    }}
                  />
                ))}
              </ul>

              <div className="sticky bottom-4 flex flex-wrap justify-end gap-2 rounded-xl border border-[#C9CDD3] bg-white p-3 shadow-sm">
                <button
                  type="button"
                  onClick={() => downloadJson(toBlind(data), `${data.case_id}.blind.json`)}
                  className="rounded-lg border border-[#C9CDD3] px-4 py-2 text-sm font-semibold"
                  title="정답(class)과 이유(why)를 지운 사본. data/e8/blind/ 에 넣어 검색 파트에 전달"
                >
                  검색 파트용 사본 저장 (정답 지움)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadJson(data, active.fileName);
                    setCases((list) => list.map((c, i) => (i === current ? { ...c, dirty: false } : c)));
                  }}
                  className="rounded-lg bg-[#1E3A5F] px-5 py-2 text-sm font-bold text-white"
                >
                  저장 (JSON 내려받기)
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
