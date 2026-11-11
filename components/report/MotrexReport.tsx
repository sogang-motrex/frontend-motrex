"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { getComparison, getReviewImageDescription, hasExternalJudge, mergeTechText, judgeLabel, type Comparison, type ReviewDetail, type Verdict } from "@/lib/api/compare";

/**
 * 모트렉스 보고서 문서 디자인 시트(MOTREX_검토_보고서_템플릿) 형식의 검토 보고서 미리보기.
 * 네이비 단일 강조, AI 요소만 청록, 경고·미확인만 황색. 위계는 구분선·여백·글자색으로만 (태그·그림자 없음).
 * 구성: 표제(키커·제목·리드·핵심 4칸) → 번호 섹션(기술 설명, 판정 요약, 특허별 비교, 판정 방법) → 꼬리말
 */

const CSS = `
.mx{--navy:#252C6D;--navy2:#3D4CA3;--navy-bg:#F1F3FA;--teal:#0E9C96;--teal-d:#0B7671;--teal-bg:#E6F4F3;--amber-d:#9A5F0C;--ink:#1E2230;--text:#30343F;--muted:#6B6F78;--line:#DCE0EA;
  background:#fff;color:var(--ink);font:16px/1.65 "Pretendard Variable",Pretendard,"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif;word-break:keep-all;overflow-wrap:break-word;padding:8px 40px 40px;border:1px solid var(--line);border-radius:10px}
.mx .brand{font-weight:900;letter-spacing:.12em;color:var(--navy);font-size:13px;padding:16px 0;border-bottom:1px solid var(--line)}
.mx section{padding:40px 0 8px;border-top:1px solid var(--line)}
.mx section.first{border-top:0;padding-top:8px}
.mx .kicker{font-size:14px;font-weight:800;color:var(--teal-d);letter-spacing:.06em;margin-top:32px}
.mx h1{font-size:34px;line-height:1.22;letter-spacing:-.02em;color:var(--navy);margin:10px 0 12px}
.mx h2{font-size:26px;letter-spacing:-.02em;color:var(--navy);margin:0 0 16px;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.mx h2 .n{font-size:17px;color:var(--teal);font-weight:800}
.mx h3{font-size:19px;color:var(--navy);margin:28px 0 10px}
.mx .lede{font-size:17px;color:var(--text);max-width:980px;margin:0}
.mx .note{font-size:13px;color:var(--muted);margin:8px 0 0}
.mx b{color:var(--navy)}
.mx .ai{color:var(--teal-d);font-weight:700}
.mx .warn{color:var(--amber-d);font-weight:700}
.mx .keys{display:grid;grid-template-columns:repeat(4,1fr);border-top:2px solid var(--navy);margin-top:24px}
.mx .keys>div{padding:16px 18px 16px 0;border-bottom:1px solid var(--line)}
.mx .keys .t{font-size:14px;font-weight:800;color:var(--teal-d);margin-bottom:6px}
.mx .keys p{margin:0;font-size:15.5px;color:var(--text)}
.mx table{width:100%;border-collapse:collapse}
.mx th{text-align:left;font-size:13px;color:var(--navy);border-bottom:2px solid var(--navy);padding:8px 10px;white-space:nowrap}
.mx td{font-size:14px;border-bottom:1px solid var(--line);padding:9px 10px;vertical-align:top;color:var(--text)}
.mx td.k{font-weight:800;color:var(--navy);white-space:nowrap}
.mx td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.mx .scroll{overflow-x:auto}
.mx .desc{background:var(--navy-bg);border-radius:10px;padding:16px 20px;color:var(--text);margin:0}
.mx ul.check{list-style:none;margin:8px 0 0;padding:0}
.mx ul.check li{font-size:14.5px;color:var(--text);padding:6px 0 6px 24px;position:relative;border-bottom:1px solid var(--line)}
.mx ul.check li::before{content:"";position:absolute;left:2px;top:11px;width:12px;height:12px;border:1.5px solid #B3BBE2;border-radius:3px}
.mx ul.check li.done::before{background:var(--navy2);border-color:var(--navy2)}
.mx .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.mx .card{border:1px solid var(--line);border-radius:10px;padding:16px 18px}
.mx .card h4{margin:0 0 6px;font-size:16px;color:var(--navy)}
.mx .card p{margin:0;color:var(--text);font-size:14.5px}
.mx footer{border-top:1px solid var(--line);margin-top:32px;padding-top:16px;font-size:13px;color:var(--muted)}
@media (max-width:900px){.mx .keys{grid-template-columns:1fr 1fr}.mx .grid3{grid-template-columns:1fr}.mx{padding:8px 20px 24px}}
@media print{
  body *{visibility:hidden}
  .mx,.mx *{visibility:visible}
  .mx{position:absolute;left:0;top:0;width:100%;border:0;padding:0}
  .mx section{break-inside:auto}
  .mx tr{break-inside:avoid}
}
`;

const VERDICT_TEXT: Record<Verdict, string> = { SAME: "유사", DIFF: "상충", CHECK: "확인 필요" };

function VerdictCell({ verdict, label }: { verdict: Verdict; label: string }) {
  if (verdict === "SAME") return <b>{VERDICT_TEXT.SAME}</b>;
  return (
    <span className="warn">
      {VERDICT_TEXT[verdict]}
      {verdict === "CHECK" && label ? ` · ${label}` : ""}
    </span>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export default function MotrexReport({ review }: { review: ReviewDetail }) {
  const patents = review.patents.filter((p) => p.comparisonStatus === "DONE");
  const imageDesc = useQuery({
    queryKey: ["review-image-description", String(review.reviewId)],
    queryFn: () => getReviewImageDescription(review.reviewId),
  });
  const results = useQueries({
    queries: patents.map((p) => ({
      queryKey: ["comparison", String(review.reviewId), p.patentId],
      queryFn: () => getComparison(review.reviewId, p.patentId),
    })),
  });

  if (results.some((r) => r.isLoading)) {
    return <div className="h-64 animate-pulse rounded-xl border border-[#E6E9ED] bg-white" />;
  }

  const comparisons = results
    .map((r, i) => ({ patent: patents[i], data: r.data?.state === "READY" ? r.data.data : null }))
    .filter((x): x is { patent: (typeof patents)[number]; data: Comparison } => Boolean(x.data));

  const rows = comparisons.flatMap((c) => c.data.rows);
  const count = (v: Verdict) => rows.filter((r) => r.verdict === v).length;
  const questions = comparisons.flatMap((c) => c.data.checkItems);
  const unanswered = questions.filter((q) => q.answerable && !q.answer).length;
  const external = comparisons.some((c) => hasExternalJudge(c.data.judge));
  const routeText = review.sensitive || !external ? "사내 모델만 사용 (외부 전송 없음)" : "외부 모델 + 사내 모델";

  return (
    <article className="mx">
      <style>{CSS}</style>
      <div className="brand">MOTREX · AI TASK</div>

      <section className="first">
        <div className="kicker">특허 비교 검토 · 사내 검토 초안</div>
        <h1>{review.title}</h1>
        <p className="lede">
          {today()} 기준. 우리 기술 설명과 특허 {comparisons.length}건의 독립 청구항을 조건 단위로 대조한 결과. 특허 침해
          여부는 판단하지 않으며, 근거가 없는 조건은 확인 필요로 분류.
        </p>
        <div className="keys">
          <div>
            <div className="t">검토 범위</div>
            <p>
              특허 {comparisons.length}건 · 구성요소 {rows.length}행
            </p>
          </div>
          <div>
            <div className="t">판정 결과</div>
            <p>
              유사 {count("SAME")} · 상충 {count("DIFF")} · 확인 필요 {count("CHECK")}
            </p>
          </div>
          <div>
            <div className="t">미확인</div>
            <p>
              {unanswered > 0 ? <span className="warn">확인 질문 미답변 {unanswered}건</span> : "미답변 확인 질문 없음"}
            </p>
          </div>
          <div>
            <div className="t">처리 경로</div>
            <p>{review.sensitive ? <span className="ai">민감 검토 · {routeText}</span> : routeText}</p>
          </div>
        </div>
      </section>

      <section>
        <h2>
          <span className="n">01</span>검토 대상 기술 설명
        </h2>
        <p className="desc" style={{ whiteSpace: "pre-wrap" }}>
          {mergeTechText(review.techDescription, imageDesc.data?.confirmed?.description) || "기술 설명 없음"}
        </p>
      </section>

      <section>
        <h2>
          <span className="n">02</span>특허별 판정 요약
        </h2>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>특허</th>
                <th>명칭</th>
                <th>기준 청구항</th>
                <th>유사</th>
                <th>상충</th>
                <th>확인 필요</th>
                <th>판정 모델</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map(({ patent, data }) => (
                <tr key={patent.patentId}>
                  <td className="k">{patent.publicationNumber ?? `특허 #${patent.patentId}`}</td>
                  <td>{patent.title ?? ""}</td>
                  <td className="num">{data.baseClaimNo}</td>
                  <td className="num">{data.verdictSummary.same}</td>
                  <td className="num">{data.verdictSummary.diff}</td>
                  <td className="num">{data.verdictSummary.check}</td>
                  <td>{(judgeLabel(data.judge) ?? "미확인").replace("판정: ", "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {comparisons.map(({ patent, data }, i) => (
        <section key={patent.patentId}>
          <h2>
            <span className="n">{String(i + 3).padStart(2, "0")}</span>
            {patent.publicationNumber ?? `특허 #${patent.patentId}`} 청구항 {data.baseClaimNo} 비교
          </h2>
          {patent.title && <p className="lede">{patent.title}</p>}
          <div className="scroll" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>구성요소</th>
                  <th>청구항 문구</th>
                  <th>우리 기술 대응·근거</th>
                  <th>판정</th>
                  <th>AI 설명</th>
                  <th>검토자 메모</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.rowId}>
                    <td className="k">{r.elementLabel}</td>
                    <td>{r.claimText}</td>
                    <td>
                      {r.counterpart ? (
                        <>
                          {r.counterpart}
                          {r.counterpartStatus === "ASSUMED" && <span className="warn"> (가정)</span>}
                        </>
                      ) : (
                        <span className="warn">대응 부품 없음</span>
                      )}
                      {r.designEvidence[0] && <div className="note">근거: {r.designEvidence[0].quote}</div>}
                    </td>
                    <td>
                      <VerdictCell verdict={r.verdict} label={r.label} />
                      {r.edited && <div className="note">수정됨{r.editedBy ? ` · ${r.editedBy.name}` : ""}</div>}
                    </td>
                    <td>
                      <span className="ai">{r.aiNote}</span>
                    </td>
                    <td>{r.reviewerMemo ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.checkItems.length > 0 && (
            <>
              <h3>확인 질문과 답변</h3>
              <ul className="check">
                {data.checkItems.map((q) => (
                  <li key={q.checkItemId} className={q.answer || q.checked ? "done" : ""}>
                    {q.content}
                    {q.answer ? (
                      <div className="note">답변: {q.answer}</div>
                    ) : q.answerable ? (
                      <div className="note">
                        <span className="warn">미답변</span>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}

      <section>
        <h2>
          <span className="n">{String(comparisons.length + 3).padStart(2, "0")}</span>판정 방법과 라벨 읽는 법
        </h2>
        <div className="grid3">
          <div className="card">
            <h4>조건 단위 근거 검증</h4>
            <p>청구항 구성요소를 조건으로 나누고, 조건마다 우리 기술 설명의 근거를 대조. 조건이 모두 확인되어야 유사.</p>
          </div>
          <div className="card">
            <h4>라벨</h4>
            <p>
              <b>유사</b>: 모든 조건 확인 · <span className="warn">상충</span>: 명시적으로 반대 ·{" "}
              <span className="warn">확인 필요</span>: 근거 부족·판정 보류 포함
            </p>
          </div>
          <div className="card">
            <h4>범위와 한계</h4>
            <p>AI가 작성한 사내 검토 초안. 침해·균등 여부는 판단하지 않으며 변리사 검토 필요.</p>
          </div>
        </div>
      </section>

      <footer>
        AI 사내 검토 초안 · 특허 침해 여부를 판단하지 않음 · 작성일 {today()} · 처리 경로: {routeText}
      </footer>
    </article>
  );
}
