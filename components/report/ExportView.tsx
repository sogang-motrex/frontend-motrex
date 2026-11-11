"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { COMPARISON_STATUS_KO, VERDICT_META, getReview, type Verdict, type VerdictSummary } from "@/lib/api/compare";
import { downloadComparisonFile, type ExportFormat } from "@/lib/api/export";
import MotrexReport from "@/components/report/MotrexReport";

const FORMATS: { format: ExportFormat; title: string; desc: string }[] = [
  { format: "docx", title: "Word (.docx)", desc: "내용을 고쳐서 쓰거나 메모를 더할 때" },
  { format: "pdf", title: "PDF", desc: "고치지 않고 그대로 전달할 때" },
];

/** 백엔드 기본 양식의 문서 구성 */
const OUTLINE = [
  "머리말: 검토 제목·검토자·작성일·비교 특허 수·민감 여부·처리 경로",
  "안내: AI가 작성한 사내 검토 초안이며 특허 침해 여부를 판단하지 않는다는 고정 문구",
  "검토 대상 기술 설명",
  "특허마다: 서지, 판정 집계, 구성요소 비교 표(우리 기술 대응·근거, 판정, AI 설명, 검토자 메모), 확인 질문과 답변",
  "생성 정보: 특허별 판정 모델과 경로, 프롬프트 버전, 생성 일시",
];

function SummaryChips({ summary }: { summary: VerdictSummary }) {
  return (
    <span className="flex items-center gap-3">
      {(["SAME", "DIFF", "CHECK"] as Verdict[]).map((v) => (
        <span key={v} className="flex items-center gap-1 text-sm">
          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${VERDICT_META[v].className}`}>{v}</span>
          <b>{summary[v.toLowerCase() as keyof VerdictSummary]}</b>
        </span>
      ))}
    </span>
  );
}

/** SCR-05 비교 자료 내보내기: 검토 건의 비교표 전체를 Word·PDF로 내려받는다 */
export default function ExportView({ reviewId }: { reviewId: string }) {
  const review = useQuery({ queryKey: ["review", reviewId], queryFn: () => getReview(reviewId) });
  const [pending, setPending] = useState<ExportFormat | null>(null);
  const [lastFile, setLastFile] = useState<string | null>(null);

  const download = useMutation({
    mutationFn: (format: ExportFormat) => downloadComparisonFile(reviewId, format),
    onMutate: (format) => {
      setPending(format);
      setLastFile(null);
    },
    onSuccess: (fileName) => setLastFile(fileName),
    onSettled: () => setPending(null),
  });

  if (review.isLoading) return <div className="h-96 animate-pulse rounded-xl border border-[#E6E9ED] bg-white" />;
  if (review.error || !review.data) {
    return (
      <div className="rounded-xl border border-[#C9CDD3] bg-white p-8">
        <p className="font-bold">{review.error instanceof ApiError ? review.error.message : "검토 건을 불러오지 못했습니다."}</p>
      </div>
    );
  }

  const { title, sensitive, patents } = review.data;
  const notReady = patents.filter((p) => p.comparisonStatus !== "DONE");
  const ready = patents.length > 0 && notReady.length === 0;

  const error = download.error;
  const errorMessage = error instanceof ApiError ? error.message : error ? "비교 자료를 만들지 못했습니다." : null;
  const pdfUnavailable = error instanceof ApiError && error.status === 503;

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/reviews/${reviewId}`} className="w-fit text-sm text-[#1E3A5F] hover:underline">
        ← 비교 검토로
      </Link>

      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">비교 자료 내보내기</h1>
          <p className="mt-1 text-sm text-[#4B5563]">{title}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            sensitive ? "bg-[#1E2633] text-white" : "bg-[#EEF0F3] text-[#374151]"
          }`}
        >
          {sensitive ? "민감 검토 · 사내 모델로만 처리됨" : "일반 검토"}
        </span>
      </section>

      <div className="rounded-lg border border-[#C9CDD3] bg-[#F1F3F6] px-4 py-3 text-sm leading-relaxed text-[#374151]">
        변리사 의뢰용으로 쓰는 <b>AI 사내 검토 초안</b>이에요. 특허 침해 여부는 판단하지 않아요. 비교표에서 고친 판정과
        메모가 그대로 들어가고, 파일은 서버에 저장되지 않아요.
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        {/* 왼쪽: 포함되는 특허와 준비 상태 */}
        <section className="flex flex-col gap-3 rounded-xl border border-[#C9CDD3] bg-white p-5">
          <h2 className="font-bold">포함되는 특허 {patents.length}건</h2>
          <ul className="flex flex-col divide-y divide-[#F1F3F6]">
            {patents.map((p) => (
              <li key={p.patentId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-semibold">{p.publicationNumber ?? `특허 #${p.patentId}`}</span>
                  {p.title && <span className="text-xs text-[#4B5563]">{p.title}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {p.verdictSummary && <SummaryChips summary={p.verdictSummary} />}
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      p.comparisonStatus === "DONE" ? "bg-[#E8EEF6] text-[#1E3A5F]" : "bg-[#FDF0E4] text-[#9A3412]"
                    }`}
                  >
                    {COMPARISON_STATUS_KO[p.comparisonStatus] ?? p.comparisonStatus}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {!ready && (
            <div className="flex flex-col items-start gap-2 rounded-lg bg-[#FDF0E4] p-3 text-sm text-[#9A3412]">
              <p>
                모든 특허의 비교표가 <b>완료</b>되어야 내보낼 수 있어요. 완료되지 않은 특허: {notReady.length}건
              </p>
              <Link href={`/reviews/${reviewId}`} className="font-semibold underline">
                비교 검토 화면에서 확인하기
              </Link>
            </div>
          )}
        </section>

        {/* 오른쪽: 형식 선택과 내려받기 */}
        <section className="flex flex-col gap-3 self-start rounded-xl border border-[#C9CDD3] bg-white p-5">
          <h2 className="font-bold">파일 형식</h2>
          {FORMATS.map((f) => (
            <div key={f.format} className="flex items-center justify-between gap-3 rounded-lg border border-[#E6E9ED] p-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{f.title}</span>
                <span className="text-xs text-[#6B7280]">{f.desc}</span>
              </div>
              <button
                type="button"
                onClick={() => download.mutate(f.format)}
                disabled={!ready || pending !== null}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1E3A5F] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {pending === f.format && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                )}
                {pending === f.format ? "만드는 중…" : "내려받기"}
              </button>
            </div>
          ))}

          {lastFile && <p className="text-sm text-[#1E3A5F]">✓ {lastFile} 을(를) 내려받았어요.</p>}
          {errorMessage && (
            <p className="rounded-lg bg-[#FBEDEA] px-3 py-2 text-sm text-[#8F2D1F]">
              {errorMessage}
              {pdfUnavailable && " Word(.docx)로 내려받아 주세요."}
            </p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-[#C9CDD3] bg-white p-5">
        <h2 className="font-bold">문서 구성</h2>
        <ol className="list-decimal pl-5 text-sm leading-7 text-[#374151]">
          {OUTLINE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
        <p className="text-xs text-[#6B7280]">모트렉스 양식을 받으면 같은 내용이 그 양식으로 바뀌어요.</p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">검토 보고서 미리보기 · 모트렉스 양식</h2>
            <p className="text-sm text-[#6B7280]">비교표 데이터로 모트렉스 보고서 디자인 시트 형식에 맞춰 만든 화면이에요. 인쇄 메뉴에서 PDF로도 저장할 수 있어요.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            className="rounded-lg border border-[#1E3A5F] px-4 py-2 text-sm font-bold text-[#1E3A5F] disabled:opacity-40"
          >
            보고서 인쇄 · PDF 저장
          </button>
        </div>
        {ready ? (
          <MotrexReport review={review.data} />
        ) : (
          <p className="rounded-xl border border-dashed border-[#9CA3AF] bg-white p-6 text-sm text-[#4B5563]">
            모든 특허의 비교표가 완료되면 보고서를 볼 수 있어요.
          </p>
        )}
      </section>
    </div>
  );
}
