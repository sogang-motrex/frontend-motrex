"use client";

import { useEffect, useRef } from "react";

export type HighlightTone = "row" | "evidence" | "focus";

export interface HighlightRange {
  start: number;
  end: number;
  tone: HighlightTone;
}

const TONE_CLASS: Record<HighlightTone, string> = {
  row: "bg-[#E8EEF6]",
  evidence: "bg-[#D9F0E3]",
  focus: "bg-[#FDE7C8] underline decoration-[#C2410C] decoration-2 underline-offset-4",
};

const PRIORITY: Record<HighlightTone, number> = { row: 1, evidence: 2, focus: 3 };

/**
 * 글자 위치(start/end)로 구간을 색칠한다. 구간이 겹치면 focus > evidence > row 순으로 보인다.
 * 가장 강한 구간이 보이도록 감싼 상자 안에서 자동으로 스크롤한다.
 */
export default function HighlightText({ text, ranges }: { text: string; ranges: HighlightRange[] }) {
  const boxRef = useRef<HTMLDivElement>(null);

  const valid = ranges
    .map((r) => ({ ...r, start: Math.max(0, r.start), end: Math.min(text.length, r.end) }))
    .filter((r) => r.end > r.start);

  const points = Array.from(new Set([0, text.length, ...valid.flatMap((r) => [r.start, r.end])])).sort((a, b) => a - b);

  const segments: { text: string; tone: HighlightTone | null }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    let tone: HighlightTone | null = null;
    for (const r of valid) {
      if (r.start <= from && r.end >= to && (!tone || PRIORITY[r.tone] > PRIORITY[tone])) tone = r.tone;
    }
    segments.push({ text: text.slice(from, to), tone });
  }

  const key = valid.map((r) => `${r.start}-${r.end}-${r.tone}`).join("|");
  useEffect(() => {
    const target =
      boxRef.current?.querySelector("[data-tone='focus']") ?? boxRef.current?.querySelector("[data-tone='evidence']");
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [key]);

  return (
    <div ref={boxRef} className="whitespace-pre-wrap text-sm leading-7 text-[#1F2630]">
      {segments.map((s, i) =>
        s.tone ? (
          <mark key={i} data-tone={s.tone} className={`rounded-sm text-inherit ${TONE_CLASS[s.tone]}`}>
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </div>
  );
}
