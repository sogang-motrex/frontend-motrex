"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import HighlightText, { type HighlightRange } from "@/components/compare/HighlightText";
import { useJob } from "@/hooks/useJob";
import { ApiError } from "@/lib/api";
import {
  ALIGN_STATUS_KO,
  CHECK_KIND_KO,
  COMPARISON_STATUS_KO,
  CONDITION_TYPE_KO,
  FLAG_KO,
  STATUS_META,
  VERDICT_META,
  getComparison,
  getReview,
  judgeName,
  requestComparison,
  requestRecheck,
  rowLabelOf,
  type AlignmentItem,
  type CheckItem,
  type Comparison,
  type CompareCondition,
  type CompareRow,
  type ReviewPatent,
  type Verdict,
  type VerdictSummary,
} from "@/lib/api/compare";

/* ------------------------------------------------------------------ */
/* 작은 부품                                                            */
/* ------------------------------------------------------------------ */

function VerdictBadge({ verdict, label }: { verdict: Verdict; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${VERDICT_META[verdict].className}`}>{verdict}</span>
      <span className="text-xs font-semibold text-[#374151]">{label}</span>
    </span>
  );
}

function SummaryChips({ summary }: { summary: VerdictSummary }) {
  return (
    <span className="flex items-center gap-3 text-sm">
      {(["SAME", "DIFF", "CHECK"] as Verdict[]).map((v) => (
        <span key={v} className="flex items-center gap-1">
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${VERDICT_META[v].className}`}>{v}</span>
          <b>{summary[v.toLowerCase() as keyof VerdictSummary]}</b>
        </span>
      ))}
    </span>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* 조건                                                                 */
/* ------------------------------------------------------------------ */

function ConditionItem({
  condition,
  selected,
  previousStatusKo,
  onSelect,
}: {
  condition: CompareCondition;
  selected: boolean;
  previousStatusKo?: string;
  onSelect: () => void;
}) {
  return (
    <li className={`rounded-lg border ${selected ? "border-[#C2410C] bg-[#FFFBF5]" : "border-[#E6E9ED] bg-white"}`}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-2 px-3 py-2.5 text-left">
        <span className="shrink-0 rounded bg-[#EEF0F3] px-1.5 py-0.5 text-xs text-[#374151]">
          {CONDITION_TYPE_KO[condition.type] ?? condition.type}
        </span>
        <span className="min-w-0 flex-1 text-sm">{condition.claimQuote}</span>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold ${STATUS_META[condition.status].className}`}
        >
          {condition.statusKo}
        </span>
      </button>

      {previousStatusKo && (
        <p className="px-3 pb-2 text-xs font-semibold text-[#1E3A5F]">
          재판정으로 변경: {previousStatusKo} → {condition.statusKo}
        </p>
      )}

      {selected && (
        <div className="flex flex-col gap-2 border-t border-[#F1E3D3] px-3 py-2.5">
          {condition.flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {condition.flags.map((f) => (
                <span key={f} className="rounded bg-[#F4F5F7] px-1.5 py-0.5 text-xs text-[#4B5563]">
                  {FLAG_KO[f] ?? f}
                </span>
              ))}
            </div>
          )}
          {condition.votes.length > 0 ? (
            condition.votes.map((v, i) => (
              <div key={i} className="flex flex-col gap-1 text-sm">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#374151]">
                  {judgeName(v.judge)}
                  <span className={`rounded border px-1.5 py-0.5 ${STATUS_META[v.status].className}`}>
                    {STATUS_META[v.status].ko}
                  </span>
                </span>
                <p className="leading-relaxed text-[#374151]">{v.reason}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6B7280]">
              {condition.flags.includes("NO_ALIGNED_ENTITY")
                ? "대응하는 부품이 없어 판정하지 않았습니다. 아래 부품 대응에서 지정할 수 있어요."
                : "판정자 의견이 없습니다."}
            </p>
          )}
          <p className="text-xs text-[#6B7280]">근거 문장 {condition.evidence.length}개 · 오른쪽 원문에서 위치를 확인하세요.</p>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* 확인 질문                                                            */
/* ------------------------------------------------------------------ */

function QuestionItem({
  item,
  draft,
  locked,
  onChange,
}: {
  item: CheckItem;
  draft: string;
  locked: boolean;
  onChange: (value: string) => void;
}) {
  const canAnswer = item.answerable && item.kind !== "EQUIVALENCE";
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[#F1D9B5] bg-[#FFFBF5] p-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-[#F6E7C8] px-1.5 py-0.5 text-xs font-semibold text-[#7A4E0B]">
          {CHECK_KIND_KO[item.kind] ?? item.kind}
        </span>
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed" title={item.content}>
          {item.content}
        </p>
        {item.checked && <span className="shrink-0 text-xs font-semibold text-[#1E3A5F]">✓ 확인함</span>}
      </div>

      {item.answer && (
        <p className="text-xs text-[#4B5563]">
          저장된 답변{item.answeredBy ? ` · ${item.answeredBy.name}` : ""}: {item.answer}
        </p>
      )}

      {canAnswer ? (
        <textarea
          rows={2}
          maxLength={2000}
          value={draft}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
          placeholder="예/아니오보다 부품과 관계를 쓴 문장으로 답해 주세요. 예) 판스프링은 슬라이더 윗면을 눌러 지지한다."
          className="resize-none rounded-md border border-[#E6D3B8] bg-white p-2 text-sm outline-none focus:border-[#C2410C] disabled:opacity-60"
        />
      ) : (
        <p className="text-xs text-[#6B7280]">
          {item.kind === "EQUIVALENCE"
            ? "균등 여부는 변리사 검토 사항이라 답변으로 다시 판단하지 않아요."
            : "이 질문은 답변으로 다시 판단할 수 없어요."}
        </p>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* 구성요소 행                                                          */
/* ------------------------------------------------------------------ */

function RowCard({
  row,
  open,
  selected,
  selectedConditionId,
  questions,
  drafts,
  locked,
  previousStatus,
  onToggle,
  onSelectCondition,
  onDraft,
}: {
  row: CompareRow;
  open: boolean;
  selected: boolean;
  selectedConditionId: string | null;
  questions: CheckItem[];
  drafts: Record<number, string>;
  locked: boolean;
  previousStatus: Map<string, string>;
  onToggle: () => void;
  onSelectCondition: (conditionId: string) => void;
  onDraft: (checkItemId: number, value: string) => void;
}) {
  return (
    <article className={`rounded-xl bg-white ${selected ? "border-2 border-[#1E3A5F]" : "border border-[#C9CDD3]"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="font-mono text-base font-bold text-[#1E3A5F]">{row.elementLabel}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="line-clamp-2 text-sm">{row.claimText}</p>
          <p className="text-xs text-[#4B5563]">
            대응 부품: <b>{row.counterpart ?? "없음"}</b>
            {row.counterpartStatus === "ASSUMED" && <span className="ml-1 rounded bg-[#EEF0F3] px-1">가정</span>}
            {" · "}조건 {row.conditions.length}개{questions.length > 0 && ` · 확인 질문 ${questions.length}개`}
          </p>
        </div>
        <VerdictBadge verdict={row.verdict} label={row.label} />
        <span className="text-xs text-[#6B7280]">{open ? "▲" : "▼"}</span>
      </button>

      {row.edited && (
        <p className="mx-4 mb-2 text-xs text-[#4B5563]">
          검토자가 판정을 수정함{row.editedBy ? ` · ${row.editedBy.name}` : ""} (AI 라벨: {row.label})
        </p>
      )}

      <div className="mx-4 mb-4 flex flex-col gap-1 rounded-lg bg-[#F7F8FA] px-3 py-2 text-sm leading-relaxed text-[#374151]">
        <p>
          <span className="mr-1 font-semibold text-[#1E3A5F]">AI 설명</span>
          {row.aiNote}
        </p>
        {row.reviewerMemo && (
          <p>
            <span className="mr-1 font-semibold text-[#374151]">검토자 메모</span>
            {row.reviewerMemo}
          </p>
        )}
      </div>

      {row.notices.length > 0 && (
        <ul className="mx-4 mb-4 flex flex-col gap-1">
          {row.notices.map((n, i) => (
            <li key={i} className="rounded-lg bg-[#FBEDEA] px-3 py-2 text-sm text-[#8F2D1F]">
              {typeof n === "string" ? n : JSON.stringify(n)}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="flex flex-col gap-4 border-t border-[#E6E9ED] p-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold">조건별 판정</h4>
            <ul className="flex flex-col gap-2">
              {row.conditions.map((c) => (
                <ConditionItem
                  key={c.conditionId}
                  condition={c}
                  selected={selectedConditionId === c.conditionId}
                  previousStatusKo={previousStatus.get(c.conditionId)}
                  onSelect={() => onSelectCondition(c.conditionId)}
                />
              ))}
            </ul>
          </div>

          {questions.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-bold">확인 질문</h4>
              <ul className="flex flex-col gap-2">
                {questions.map((q) => (
                  <QuestionItem
                    key={q.checkItemId}
                    item={q}
                    draft={drafts[q.checkItemId] ?? q.answer ?? ""}
                    locked={locked}
                    onChange={(v) => onDraft(q.checkItemId, v)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 부품 대응                                                            */
/* ------------------------------------------------------------------ */

function AlignmentPanel({
  items,
  drafts,
  locked,
  onChange,
}: {
  items: AlignmentItem[];
  drafts: Record<string, AlignmentItem>;
  locked: boolean;
  onChange: (item: AlignmentItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-xl border border-[#C9CDD3] bg-white">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4 text-left">
        <span className="text-sm font-bold">부품 대응 (청구항 부품 ↔ 우리 기술 부품)</span>
        <span className="text-xs text-[#6B7280]">{open ? "▲ 접기" : "▼ 펼쳐서 고치기"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-[#E6E9ED] p-4">
          <p className="text-xs text-[#6B7280]">
            &apos;대응 부품 없음&apos; 조건은 답변만으로는 다시 판단하지 않아요. 여기서 대응 부품을 지정한 뒤 다시 판단하세요.
          </p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-[#6B7280]">
              <tr>
                <th className="py-1">청구항 부품</th>
                <th className="py-1">우리 기술 부품</th>
                <th className="py-1">상태</th>
              </tr>
            </thead>
            <tbody>
              {items.map((original) => {
                const a = drafts[original.claimName] ?? original;
                return (
                  <tr key={original.claimName} className="border-t border-[#F1F3F6]">
                    <td className="py-1.5 pr-2">{original.claimName}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={a.inputName ?? ""}
                        disabled={locked || a.status === "NONE"}
                        placeholder={a.status === "NONE" ? "대응 없음" : "부품 이름"}
                        onChange={(e) => onChange({ ...a, inputName: e.target.value || null })}
                        className="w-full rounded border border-[#E6E9ED] px-2 py-1 disabled:bg-[#F7F8FA]"
                      />
                    </td>
                    <td className="py-1.5">
                      <select
                        value={a.status}
                        disabled={locked}
                        onChange={(e) => onChange({ ...a, status: e.target.value as AlignmentItem["status"] })}
                        className="rounded border border-[#E6E9ED] px-1 py-1 text-xs"
                      >
                        {(Object.keys(ALIGN_STATUS_KO) as AlignmentItem["status"][]).map((s) => (
                          <option key={s} value={s}>
                            {ALIGN_STATUS_KO[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 화면 전체                                                            */
/* ------------------------------------------------------------------ */

function patentName(p: ReviewPatent): string {
  return p.publicationNumber ?? `특허 #${p.patentId}`;
}

/** SCR-04 비교 검토: 특허 탭별 비교표, 조건 펼침, 양쪽 근거 하이라이트, 확인 질문 답변 → 재판정 */
export default function ComparisonView({ reviewId, initialJobId }: { reviewId: string; initialJobId: string | null }) {
  const queryClient = useQueryClient();

  const review = useQuery({ queryKey: ["review", reviewId], queryFn: () => getReview(reviewId) });
  const patents = review.data?.patents ?? [];
  const [activePatentId, setActivePatentId] = useState<number | null>(null);
  const patentId = activePatentId ?? patents[0]?.patentId ?? null;

  /* 비교표 생성 작업 (특허 전부, progress는 특허 단위) */
  const [genJobId, setGenJobId] = useState<string | null>(initialJobId);
  const genJob = useJob(genJobId, 3000);

  /** 이미 끝까지 확인한 작업. 끝난 작업을 다시 확인하지 않게 해서 무한 반복을 막는다 */
  const finishedJobs = useRef(new Set<string>());

  const comparison = useQuery({
    queryKey: ["comparison", reviewId, patentId],
    queryFn: () => getComparison(reviewId, patentId as number),
    enabled: patentId !== null,
    // 생성 중인데 확인할 작업이 없으면 비교표를 직접 5초마다 다시 불러온다
    refetchInterval: (q) => (q.state.data?.state === "GENERATING" ? 5000 : false),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["review", reviewId] });
    queryClient.invalidateQueries({ queryKey: ["comparison", reviewId] });
  };

  useEffect(() => {
    const data = comparison.data;
    if (data?.state === "GENERATING" && !genJobId && !finishedJobs.current.has(data.jobId)) setGenJobId(data.jobId);
  }, [comparison.data, genJobId]);

  useEffect(() => {
    const status = genJob.data?.status;
    if (!genJobId || (status !== "DONE" && status !== "FAILED")) return;
    if (finishedJobs.current.has(genJobId)) return;
    finishedJobs.current.add(genJobId);
    refresh();
    if (status === "DONE") setGenJobId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genJob.data?.status, genJobId]);

  /* 생성 경과 시간 (특허가 1건이면 진행률이 0 → 100으로만 바뀌어서 시간을 보여 준다) */
  const [genStartedAt, setGenStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setGenStartedAt(genJobId ? Date.now() : null);
  }, [genJobId]);
  useEffect(() => {
    if (!genStartedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [genStartedAt]);

  const generate = useMutation({
    mutationFn: () => requestComparison(reviewId),
    onSuccess: (res) => (res.status === "DONE" ? refresh() : setGenJobId(res.jobId)),
  });

  /* 선택 상태와 입력 */
  const [openRows, setOpenRows] = useState<number[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [answerDrafts, setAnswerDrafts] = useState<Record<number, string>>({});
  const [alignDrafts, setAlignDrafts] = useState<Record<string, AlignmentItem>>({});

  /* 재판정 작업 (약 3~4분, progress는 0 → 100) */
  const [recheckJobId, setRecheckJobId] = useState<string | null>(null);
  const [before, setBefore] = useState<Comparison | null>(null);
  const [recheckDone, setRecheckDone] = useState(false);
  const recheckJob = useJob(recheckJobId, 5000);

  const data = comparison.data?.state === "READY" ? comparison.data.data : null;

  const recheck = useMutation({
    mutationFn: () => {
      const answers = (data?.checkItems ?? [])
        .filter((q) => {
          const draft = (answerDrafts[q.checkItemId] ?? "").trim();
          return draft && draft !== (q.answer ?? "");
        })
        .map((q) => ({ checkItemId: q.checkItemId, answer: answerDrafts[q.checkItemId].trim() }));
      const alignment = Object.values(alignDrafts);
      return requestRecheck(reviewId, patentId as number, {
        answers: answers.length ? answers : undefined,
        alignment: alignment.length ? alignment : undefined,
      });
    },
    onSuccess: (res) => {
      setBefore(data);
      setRecheckDone(false);
      setRecheckJobId(res.jobId);
    },
  });

  useEffect(() => {
    const status = recheckJob.data?.status;
    if (status === "DONE") {
      setRecheckJobId(null);
      setAnswerDrafts({});
      setAlignDrafts({});
      setRecheckDone(true);
      refresh();
    } else if (status === "FAILED") {
      setRecheckJobId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recheckJob.data?.status]);

  const switchPatent = (id: number) => {
    setActivePatentId(id);
    setOpenRows([]);
    setSelectedRow(null);
    setSelectedCondition(null);
    setAnswerDrafts({});
    setAlignDrafts({});
    setBefore(null);
    setRecheckDone(false);
  };

  /** 재판정으로 상태가 바뀐 조건: 조건ID → 이전 상태 이름 */
  const previousStatus = useMemo(() => {
    const map = new Map<string, string>();
    if (!before || !data || !recheckDone) return map;
    const old = new Map(before.rows.flatMap((r) => r.conditions.map((c) => [c.conditionId, c] as const)));
    for (const c of data.rows.flatMap((r) => r.conditions)) {
      const prev = old.get(c.conditionId);
      if (prev && prev.status !== c.status) map.set(c.conditionId, prev.statusKo);
    }
    return map;
  }, [before, data, recheckDone]);

  /* ---------------- 화면 ---------------- */

  if (review.isLoading) return <div className="h-96 animate-pulse rounded-xl border border-[#E6E9ED] bg-white" />;
  if (review.error) {
    return (
      <div className="rounded-xl border border-[#C9CDD3] bg-white p-8">
        <p className="font-bold">{review.error instanceof ApiError ? review.error.message : "검토 건을 불러오지 못했습니다."}</p>
        <Link href="/search" className="mt-4 inline-block text-sm text-[#1E3A5F] underline">
          새 검토 시작하기
        </Link>
      </div>
    );
  }

  const sensitive = review.data?.sensitive ?? false;
  const techDescription = review.data?.techDescription ?? "";
  const generating = Boolean(genJobId) && genJob.data?.status !== "FAILED";
  const rechecking = Boolean(recheckJobId) || recheck.isPending;

  const row = data?.rows.find((r) => r.rowId === selectedRow) ?? null;
  const condition = row?.conditions.find((c) => c.conditionId === selectedCondition) ?? null;

  const claimRanges: HighlightRange[] = [];
  if (row) claimRanges.push({ start: row.start, end: row.end, tone: "row" });
  if (condition) claimRanges.push({ start: condition.start, end: condition.end, tone: "focus" });

  const evidence = condition ? condition.evidence : row ? row.designEvidence : [];
  const descRanges: HighlightRange[] = evidence
    .filter((e) => e.source === "DESCRIPTION")
    .map((e) => ({ start: e.start, end: e.end, tone: condition ? "focus" : "evidence" }));
  const answerEvidence = evidence.filter((e) => e.source === "ANSWER");

  const questionsByRow = new Map<string, CheckItem[]>();
  const otherQuestions: CheckItem[] = [];
  for (const q of data?.checkItems ?? []) {
    const label = data ? rowLabelOf(q, data.rows) : null;
    if (label && data?.rows.some((r) => r.elementLabel === label)) {
      questionsByRow.set(label, [...(questionsByRow.get(label) ?? []), q]);
    } else otherQuestions.push(q);
  }

  const newAnswerCount = (data?.checkItems ?? []).filter((q) => {
    const d = (answerDrafts[q.checkItemId] ?? "").trim();
    return d && d !== (q.answer ?? "");
  }).length;
  const alignCount = Object.keys(alignDrafts).length;
  const recheckError =
    (recheck.error instanceof ApiError ? recheck.error.message : recheck.error ? "다시 판단을 요청하지 못했습니다." : null) ??
    (recheckJob.data?.status === "FAILED" ? (recheckJob.data.error ?? "다시 판단하지 못했습니다.") : null);

  return (
    <div className="flex flex-col gap-5 pb-32">
      <div className="flex items-center gap-3 rounded-lg border border-[#C9CDD3] bg-[#F1F3F6] px-4 py-3 text-sm">
        <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border border-[#374151] text-xs">
          i
        </span>
        판정은 검토를 돕는 참고 표시이며, 시스템은 특허 침해 여부를 자동으로 판정하지 않습니다.
      </div>

      {/* 검토 건 정보 + 특허 탭 */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">{review.data?.title}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              sensitive ? "bg-[#1E2633] text-white" : "bg-[#EEF0F3] text-[#374151]"
            }`}
          >
            {sensitive ? "민감 검토 · 내부 AI 모델만 사용" : "일반 검토"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {patents.map((p) => (
            <button
              key={p.patentId}
              type="button"
              onClick={() => switchPatent(p.patentId)}
              className={`flex flex-col items-start gap-1 rounded-t-lg border border-b-0 px-4 py-2 text-left ${
                p.patentId === patentId ? "border-[#C9CDD3] bg-white" : "border-[#E6E9ED] bg-[#EEF0F3]"
              }`}
            >
              <span className="font-mono text-sm font-semibold text-[#1E3A5F]">{patentName(p)}</span>
              <span className="flex items-center gap-2 text-xs text-[#4B5563]">
                {COMPARISON_STATUS_KO[p.comparisonStatus] ?? p.comparisonStatus}
                {p.verdictSummary && <SummaryChips summary={p.verdictSummary} />}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 비교표 생성 진행 */}
      {generating && (
        <div className="flex flex-col gap-2 rounded-xl border border-[#9DB3CF] bg-[#F2F6FB] p-4 text-sm">
          <span className="flex items-center gap-2 font-semibold text-[#1E3A5F]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9DB3CF] border-t-[#1E3A5F]" aria-hidden />
            비교표를 만드는 중…
            {patents.length > 1 && ` ${genJob.data?.progress ?? 0}% ·`}
            {genStartedAt &&
              ` ${Math.floor((now - genStartedAt) / 60000)}분 ${Math.floor(((now - genStartedAt) % 60000) / 1000)}초째`}
          </span>
          <span className="text-xs text-[#4B5563]">AI가 청구항 조건을 하나씩 판정하고 있어요. 특허 한 건에 몇 분씩 걸리고, 이 화면을 떠나도 계속 진행돼요.</span>
          {patents.length > 1 ? (
            <span className="h-2 overflow-hidden rounded-full bg-[#DCE5F0]">
              <span className="block h-full bg-[#1E3A5F] transition-all" style={{ width: `${genJob.data?.progress ?? 0}%` }} />
            </span>
          ) : (
            <span className="h-2 animate-pulse rounded-full bg-[#9DB3CF]" />
          )}
        </div>
      )}
      {genJob.data?.status === "FAILED" && data?.status !== "FAILED" && (
        <p className="rounded-lg bg-[#FBEDEA] px-4 py-3 text-sm text-[#8F2D1F]">
          비교표 생성 중 문제가 생겼어요: {genJob.data.error} (성공한 특허의 비교표는 그대로 볼 수 있어요)
        </p>
      )}

      {/* 비교표 상태별 화면 */}
      {comparison.isLoading && <div className="h-64 animate-pulse rounded-xl border border-[#E6E9ED] bg-white" />}

      {comparison.data?.state === "GENERATING" && !generating && (
        <p className="rounded-xl border border-[#C9CDD3] bg-white p-6 text-sm">이 특허의 비교표를 만드는 중이에요.</p>
      )}

      {(comparison.data?.state === "NONE" || comparison.data?.state === "STALE") && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-[#C9CDD3] bg-white p-6 text-sm">
          <p className="font-semibold">
            {comparison.data.state === "STALE" ? comparison.data.message : "비교표가 아직 생성되지 않았습니다."}
          </p>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending || generating}
            className="rounded-lg bg-[#1E3A5F] px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {comparison.data.state === "STALE" ? "비교표 다시 생성" : "비교표 생성"}
          </button>
          {generate.error && (
            <p className="text-[#8F2D1F]">
              {generate.error instanceof ApiError ? generate.error.message : "비교표 생성을 요청하지 못했습니다."}
            </p>
          )}
        </div>
      )}

      {comparison.error && (
        <p className="rounded-lg bg-[#FBEDEA] px-4 py-3 text-sm text-[#8F2D1F]">
          {comparison.error instanceof ApiError ? comparison.error.message : "비교표를 불러오지 못했습니다."}
        </p>
      )}

      {data?.status === "FAILED" && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-[#E7B4AC] bg-[#FBEDEA] p-5 text-sm text-[#8F2D1F]">
          <p className="font-semibold">비교표 생성 실패: {data.error ?? "알 수 없는 오류"}</p>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending || generating}
            className="rounded-lg bg-[#1E3A5F] px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            {generating ? "다시 만드는 중…" : "비교표 다시 생성"}
          </button>
          {generate.error && (
            <p>{generate.error instanceof ApiError ? generate.error.message : "비교표 생성을 요청하지 못했습니다."}</p>
          )}
        </div>
      )}

      {data && data.rows.length > 0 && (
        <>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#C9CDD3] bg-white px-5 py-4">
            <span className="text-sm font-semibold">기준 청구항 {data.baseClaimNo}</span>
            <SummaryChips summary={data.verdictSummary} />
          </section>

          {recheckDone && (
            <div className="rounded-lg border border-[#9DB3CF] bg-[#E8EEF6] px-4 py-3 text-sm">
              <b>재판정 완료</b> · 조건 {previousStatus.size}개의 판정이 바뀌었어요. 바뀐 조건에 표시가 붙어 있어요.
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <section className="flex flex-col gap-3">
              {data.rows.map((r) => (
                <RowCard
                  key={r.rowId}
                  row={r}
                  open={openRows.includes(r.rowId)}
                  selected={selectedRow === r.rowId}
                  selectedConditionId={selectedCondition}
                  questions={questionsByRow.get(r.elementLabel) ?? []}
                  drafts={answerDrafts}
                  locked={rechecking}
                  previousStatus={previousStatus}
                  onToggle={() => {
                    setOpenRows((list) => (list.includes(r.rowId) ? list.filter((v) => v !== r.rowId) : [...list, r.rowId]));
                    setSelectedRow(r.rowId);
                    setSelectedCondition(null);
                  }}
                  onSelectCondition={(cid) => {
                    setSelectedRow(r.rowId);
                    setSelectedCondition(cid);
                  }}
                  onDraft={(id, v) => setAnswerDrafts((d) => ({ ...d, [id]: v }))}
                />
              ))}

              {otherQuestions.length > 0 && (
                <section className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-4">
                  <h4 className="text-sm font-bold">그 밖의 확인 사항</h4>
                  <ul className="flex flex-col gap-2">
                    {otherQuestions.map((q) => (
                      <QuestionItem
                        key={q.checkItemId}
                        item={q}
                        draft={answerDrafts[q.checkItemId] ?? q.answer ?? ""}
                        locked={rechecking}
                        onChange={(v) => setAnswerDrafts((d) => ({ ...d, [q.checkItemId]: v }))}
                      />
                    ))}
                  </ul>
                </section>
              )}

              <AlignmentPanel
                items={data.alignment}
                drafts={alignDrafts}
                locked={rechecking}
                onChange={(item) => setAlignDrafts((d) => ({ ...d, [item.claimName]: item }))}
              />
            </section>

            <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-20">
              <div className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-4">
                <h3 className="flex items-center justify-between text-sm font-bold">
                  특허 청구항 {data.baseClaimNo}
                  <span className="text-xs font-normal text-[#6B7280]">
                    {condition ? "선택한 조건" : row ? "선택한 구성요소" : "행이나 조건을 눌러 보세요"}
                  </span>
                </h3>
                <div className="max-h-[34vh] overflow-y-auto pr-1">
                  <HighlightText text={data.baseClaimText} ranges={claimRanges} />
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-4">
                <h3 className="flex items-center justify-between text-sm font-bold">
                  우리 기술 설명
                  <span className="text-xs font-normal text-[#6B7280]">
                    {evidence.length ? `근거 문장 ${evidence.length}개` : condition ? "근거 문장 없음" : ""}
                  </span>
                </h3>
                <div className="max-h-[30vh] overflow-y-auto pr-1">
                  {techDescription ? (
                    <HighlightText text={techDescription} ranges={descRanges} />
                  ) : (
                    <p className="text-sm text-[#6B7280]">검토 건의 기술 설명을 불러오지 못했어요.</p>
                  )}
                </div>
                {answerEvidence.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-[#E6E9ED] pt-2">
                    <span className="text-xs font-semibold text-[#1E3A5F]">사용자 답변에서 찾은 근거</span>
                    {answerEvidence.map((e) => (
                      <p key={e.factId} className="rounded-md bg-[#FDE7C8] px-2 py-1 text-sm">
                        {e.quote}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* 아래: 재판정 바 */}
          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#2B3646] bg-[#1E2633]">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-3 text-sm text-[#F4F5F7]">
              {!sensitive && (
                <p className="text-xs text-[#AFBBD0]">
                  일반 검토라 답변과 부품 대응이 외부 AI 모델로 전송될 수 있어요. 민감한 내용은 검토 건을 민감으로 바꾼 뒤 입력하세요.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {rechecking ? (
                  <span className="flex items-center gap-2">
                    <Spinner /> AI가 다시 판단하는 중… 3~4분 정도 걸려요. 이 화면을 떠나도 계속 진행돼요.
                  </span>
                ) : (
                  <span>
                    새 답변 <b>{newAnswerCount}</b>개 · 부품 대응 변경 <b>{alignCount}</b>개
                    {recheckError && <span className="ml-3 text-[#F6B4A8]">{recheckError}</span>}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => recheck.mutate()}
                    disabled={rechecking || (newAnswerCount === 0 && alignCount === 0)}
                    className="rounded-lg bg-white px-4 py-2 font-bold text-[#1E2633] disabled:opacity-40"
                  >
                    답변으로 다시 판단
                  </button>
                  <Link href={`/reviews/${reviewId}/report`} className="rounded-lg border border-white/40 px-4 py-2 font-semibold">
                    비교 자료 내보내기 →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
