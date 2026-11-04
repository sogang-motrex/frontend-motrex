"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import HighlightText, { type HighlightRange } from "@/components/compare/HighlightText";
import {
  CHECK_KIND_KO,
  CONDITION_TYPE_KO,
  FLAG_KO,
  SCENARIOS,
  STATUS_META,
  VERDICT_META,
  getComparison,
  getRecheckJob,
  judgeName,
  startRecheck,
  type AnswerInput,
  type CheckItem,
  type CompareCondition,
  type CompareResponse,
  type CompareRow,
  type CompareScenario,
  type ConditionStatus,
  type Verdict,
} from "@/lib/api/compare";

/* ------------------------------------------------------------------ */
/* 작은 부품                                                            */
/* ------------------------------------------------------------------ */

function VerdictBadge({ verdict, label }: { verdict: Verdict; label: string }) {
  const meta = VERDICT_META[verdict];
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${meta.className}`}>{verdict}</span>
      <span className="text-xs text-[#4B5563]">{verdict === "CHECK" ? label : meta.ko}</span>
    </span>
  );
}

function StatusChip({ status, text }: { status: ConditionStatus; text: string }) {
  return <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold ${STATUS_META[status]}`}>{text}</span>;
}

function SummaryChip({ verdict, count }: { verdict: Verdict; count: number }) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${VERDICT_META[verdict].className}`}>{verdict}</span>
      <b>{count}</b>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 조건 한 줄                                                           */
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
        <StatusChip status={condition.status} text={condition.statusKo} />
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
                  <StatusChip status={v.status} text={v.status === "SUPPORTED" ? "확인" : v.status === "CONTRADICTED" ? "상충" : v.status === "UNCERTAIN" ? "판정 보류" : "근거 부족"} />
                </span>
                <p className="leading-relaxed text-[#374151]">{v.reason}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#6B7280]">
              {condition.flags.includes("NO_ALIGNED_ENTITY")
                ? "대응하는 부품이 없어 판정하지 않았습니다."
                : "판정자 의견이 없습니다."}
            </p>
          )}
          <p className="text-xs text-[#6B7280]">
            근거 문장 {condition.evidence.length}개 · 오른쪽 원문에서 위치를 확인하세요.
          </p>
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
  value,
  disabled,
  onChange,
}: {
  item: CheckItem;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[#F1D9B5] bg-[#FFFBF5] p-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-[#F6E7C8] px-1.5 py-0.5 text-xs font-semibold text-[#7A4E0B]">
          {CHECK_KIND_KO[item.kind] ?? item.kind}
        </span>
        <p className="line-clamp-3 text-sm leading-relaxed" title={item.text}>
          {item.text}
        </p>
      </div>
      <textarea
        rows={2}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예/아니오보다 부품과 관계를 쓴 문장으로 답해 주세요. 예) 판스프링은 슬라이더 윗면을 눌러 지지한다."
        className="resize-none rounded-md border border-[#E6D3B8] bg-white p-2 text-sm outline-none focus:border-[#C2410C] disabled:opacity-60"
      />
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
  answers,
  locked,
  previousStatus,
  onToggle,
  onSelectCondition,
  onAnswer,
}: {
  row: CompareRow;
  open: boolean;
  selected: boolean;
  selectedConditionId: string | null;
  questions: CheckItem[];
  answers: Record<string, string>;
  locked: boolean;
  previousStatus: Map<string, string>;
  onToggle: () => void;
  onSelectCondition: (conditionId: string) => void;
  onAnswer: (questionId: string, value: string) => void;
}) {
  return (
    <article className={`rounded-xl bg-white ${selected ? "border-2 border-[#1E3A5F]" : "border border-[#C9CDD3]"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="font-mono text-base font-bold text-[#1E3A5F]">{row.elementLabel}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="line-clamp-2 text-sm">{row.text}</p>
          <p className="text-xs text-[#4B5563]">
            대응 부품: <b>{row.counterpart ?? "없음"}</b>
            {row.counterpartStatus === "ASSUMED" && <span className="ml-1 rounded bg-[#EEF0F3] px-1">가정</span>}
            {" · "}조건 {row.conditions.length}개{questions.length > 0 && ` · 확인 질문 ${questions.length}개`}
          </p>
        </div>
        <VerdictBadge verdict={row.verdict} label={row.label} />
        <span className="text-xs text-[#6B7280]">{open ? "▲" : "▼"}</span>
      </button>

      <div className="mx-4 mb-4 rounded-lg bg-[#F7F8FA] px-3 py-2 text-sm leading-relaxed text-[#374151]">
        <span className="mr-1 font-semibold text-[#1E3A5F]">AI 설명</span>
        {row.aiNote}
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
                    key={q.questionId}
                    item={q}
                    value={answers[q.questionId] ?? ""}
                    disabled={locked}
                    onChange={(v) => onAnswer(q.questionId, v)}
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
/* 화면 전체                                                            */
/* ------------------------------------------------------------------ */

/** SCR-04 비교 검토: 청구항 구성요소별 판정, 조건 펼침, 양쪽 근거 하이라이트, 확인 질문 → 재판정 */
export default function ComparisonView({ reviewId }: { reviewId: string }) {
  const [scenario, setScenario] = useState<CompareScenario>("same");
  const { data, isLoading } = useQuery({
    queryKey: ["comparison", scenario],
    queryFn: () => getComparison(scenario),
  });

  const [rechecked, setRechecked] = useState<CompareResponse | null>(null);
  const [before, setBefore] = useState<CompareResponse | null>(null);
  const [openRows, setOpenRows] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState<string | null>(null);

  const response = rechecked ?? data?.response ?? null;
  const request = data?.request ?? null;

  const job = useQuery({
    queryKey: ["recheck-job", jobId],
    queryFn: () => getRecheckJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (q) => (q.state.data?.status === "DONE" || q.state.data?.status === "FAILED" ? false : 500),
  });

  useEffect(() => {
    if (job.data?.status === "DONE" && job.data.result) {
      setBefore(response);
      setRechecked(job.data.result);
      setAnswers({});
      setJobId(null);
    }
    // response는 완료 시점의 값만 필요하므로 의존성에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.data]);

  const changeScenario = (next: CompareScenario) => {
    setScenario(next);
    setRechecked(null);
    setBefore(null);
    setOpenRows([]);
    setSelectedRow(null);
    setSelectedCondition(null);
    setAnswers({});
    setJobId(null);
  };

  /** 재판정 전 상태: 조건ID → 이전 상태 이름 (상태가 바뀐 조건만) */
  const previousStatus = useMemo(() => {
    const map = new Map<string, string>();
    if (!before || !rechecked) return map;
    const old = new Map(before.rows.flatMap((r) => r.conditions.map((c) => [c.conditionId, c] as const)));
    for (const c of rechecked.rows.flatMap((r) => r.conditions)) {
      const prev = old.get(c.conditionId);
      if (prev && prev.status !== c.status) map.set(c.conditionId, prev.statusKo);
    }
    return map;
  }, [before, rechecked]);

  if (isLoading || !response || !request) {
    return <div className="h-96 animate-pulse rounded-xl border border-[#E6E9ED] bg-white" />;
  }

  const row = response.rows.find((r) => r.elementId === selectedRow) ?? null;
  const condition = row?.conditions.find((c) => c.conditionId === selectedCondition) ?? null;

  // 청구항 쪽 하이라이트 (claimText 기준)
  const claimRanges: HighlightRange[] = [];
  if (row) claimRanges.push({ start: row.start, end: row.end, tone: "row" });
  if (condition) claimRanges.push({ start: condition.start, end: condition.end, tone: "focus" });

  // 기술 설명 쪽 하이라이트 (techDescription 기준, ANSWER는 따로 표시)
  const evidence = condition ? condition.evidence : row ? row.designEvidence : [];
  const descRanges: HighlightRange[] = evidence
    .filter((e) => e.source === "DESCRIPTION")
    .map((e) => ({ start: e.start, end: e.end, tone: condition ? "focus" : "evidence" }));
  const answerEvidence = evidence.filter((e) => e.source === "ANSWER");

  const answerList: AnswerInput[] = response.checkItems
    .filter((q) => (answers[q.questionId] ?? "").trim())
    .map((q) => ({ questionId: q.questionId, conditionIds: q.conditionIds, answer: answers[q.questionId].trim() }));

  const running = Boolean(jobId);
  const canRecheck = Boolean(SCENARIOS[scenario].recheck) && !rechecked;

  const toggleRow = (id: string) => {
    setOpenRows((list) => (list.includes(id) ? list.filter((v) => v !== id) : [...list, id]));
    setSelectedRow(id);
    setSelectedCondition(null);
  };

  const fillSampleAnswers = () => {
    const sample = SCENARIOS[scenario].sampleAnswers ?? [];
    setAnswers(Object.fromEntries(sample.map((a) => [a.questionId, a.answer])));
    const labels = new Set(sample.map((a) => a.questionId.split("-")[0]));
    setOpenRows(response.rows.filter((r) => labels.has(r.elementLabel)).map((r) => r.elementId));
  };

  const runRecheck = async () => {
    const { jobId: id } = await startRecheck(scenario, request, response, answerList);
    setJobId(id);
  };

  const progress = job.data?.progress ?? 0;

  return (
    <div className="flex flex-col gap-5 pb-28">
      {/* 개발용: 예시 데이터 전환 */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#9DB3CF] bg-[#F2F6FB] px-4 py-2 text-sm">
        <span className="font-semibold text-[#1E3A5F]">예시 데이터</span>
        <select
          value={scenario}
          onChange={(e) => changeScenario(e.target.value as CompareScenario)}
          className="rounded-md border border-[#C9CDD3] bg-white px-2 py-1"
        >
          {(Object.keys(SCENARIOS) as CompareScenario[]).map((key) => (
            <option key={key} value={key}>
              {SCENARIOS[key].label}
            </option>
          ))}
        </select>
        <span className="text-[#4B5563]">백엔드 연결 전 AI 서버 실제 응답 예시로 표시 중</span>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-[#C9CDD3] bg-[#F1F3F6] px-4 py-3 text-sm">
        <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border border-[#374151] text-xs">
          i
        </span>
        판정은 검토를 돕는 참고 표시이며, 시스템은 특허 침해 여부를 자동으로 판정하지 않습니다.
      </div>

      {/* 요약 */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#C9CDD3] bg-white px-5 py-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-bold">
            <span className="font-mono">{response.docId}</span> · 청구항 {response.claimNo}
          </h1>
          <p className="text-xs text-[#6B7280]">
            판정 {response.llmCalls}회 · {Math.round(response.elapsedMs / 1000)}초 · 엄격도 {response.level} · 검색{" "}
            {response.retrieval}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SummaryChip verdict="SAME" count={response.summary.SAME} />
          <SummaryChip verdict="DIFF" count={response.summary.DIFF} />
          <SummaryChip verdict="CHECK" count={response.summary.CHECK} />
        </div>
      </section>

      {rechecked && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#9DB3CF] bg-[#E8EEF6] px-4 py-3 text-sm">
          <span>
            <b>재판정 완료</b> · 조건 {previousStatus.size}개의 판정이 바뀌었습니다. 바뀐 조건에 표시가 붙어 있어요.
          </span>
          <button
            type="button"
            onClick={() => {
              setRechecked(null);
              setBefore(null);
            }}
            className="rounded-md border border-[#9DB3CF] bg-white px-3 py-1 text-xs font-semibold"
          >
            재판정 전으로 보기
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* 왼쪽: 구성요소 행 */}
        <section className="flex flex-col gap-3">
          {response.rows.map((r) => (
            <RowCard
              key={r.elementId}
              row={r}
              open={openRows.includes(r.elementId)}
              selected={selectedRow === r.elementId}
              selectedConditionId={selectedCondition}
              questions={response.checkItems.filter((q) => q.elementLabel === r.elementLabel)}
              answers={answers}
              locked={running || Boolean(rechecked)}
              previousStatus={previousStatus}
              onToggle={() => toggleRow(r.elementId)}
              onSelectCondition={(cid) => {
                setSelectedRow(r.elementId);
                setSelectedCondition(cid);
              }}
              onAnswer={(qid, v) => setAnswers((a) => ({ ...a, [qid]: v }))}
            />
          ))}
        </section>

        {/* 오른쪽: 원문 비교 */}
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-20">
          <div className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-4">
            <h3 className="flex items-center justify-between text-sm font-bold">
              특허 청구항 {response.claimNo}
              <span className="text-xs font-normal text-[#6B7280]">{condition ? "선택한 조건" : row ? "선택한 구성요소" : "행이나 조건을 눌러 보세요"}</span>
            </h3>
            <div className="max-h-[34vh] overflow-y-auto pr-1">
              <HighlightText text={response.claimText} ranges={claimRanges} />
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
              <HighlightText text={request.techDescription} ranges={descRanges} />
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm text-[#F4F5F7]">
          {running ? (
            <div className="flex flex-1 items-center gap-3">
              <span className="shrink-0">AI가 다시 판단하는 중… {progress}%</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full bg-[#7DB3EA] transition-all" style={{ width: `${progress}%` }} />
              </span>
            </div>
          ) : (
            <span>
              답변 <b>{answerList.length}</b>개 작성됨
              {!canRecheck && !rechecked && " · 이 예시 데이터는 재판정 예시가 없어요"}
            </span>
          )}
          <div className="flex items-center gap-2">
            {canRecheck && !running && (
              <button type="button" onClick={fillSampleAnswers} className="rounded-lg border border-white/40 px-3 py-2 text-xs">
                예시 답변 채우기
              </button>
            )}
            <button
              type="button"
              onClick={runRecheck}
              disabled={!canRecheck || running || answerList.length === 0}
              className="rounded-lg bg-white px-4 py-2 font-bold text-[#1E2633] disabled:opacity-40"
            >
              답변으로 다시 판단
            </button>
            <Link href={`/reviews/${reviewId}/report`} className="rounded-lg border border-white/40 px-4 py-2 font-semibold">
              보고서 생성 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
