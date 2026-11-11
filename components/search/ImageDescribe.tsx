"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState, type DragEvent } from "react";
import { useJob } from "@/hooks/useJob";
import { ApiError } from "@/lib/api";
import {
  getImageDescription,
  requestImageDescribe,
  validateImage,
  type ImageDescribeResult,
} from "@/lib/api/imageDescribe";

/** 이름이 비어 있는 부품: name이 "부호 115"처럼 "부호"로 시작 */
const isUnnamed = (name: string) => name.trim().startsWith("부호");

/**
 * SCR-01 도면 업로드 → 설명 확인.
 * AI 초안을 바로 검색칸에 넣지 않고, 사용자가 고치고 "확인"을 눌러야 검색·비교에 쓰인다.
 * 확인한 도면 글은 사용자가 쓴 기술 설명과 따로 보관한다 (검토 건 생성 후 서버에 확정).
 * 로컬 모델이 이름 없는 부호(115, 120 등)에 부품명을 지어낼 수 있어서다.
 */
export default function ImageDescribe({
  onConfirm,
  onDescribed,
  onPendingChange,
}: {
  /** 확인한 도면 글과 도면 설명 결과 ID. 다시 고치기 시작하면 (null, null) */
  onConfirm: (text: string | null, descriptionId: number | null) => void;
  onDescribed: (result: ImageDescribeResult) => void;
  /** 확인 전 초안이 있는지 (있으면 검색을 막는다) */
  onPendingChange: (pending: boolean) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // 확인 화면 상태
  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<Record<string, string>>({}); // "부호 115" → 입력한 이름
  const [applied, setApplied] = useState<Record<string, string>>({}); // 설명에 반영한 이름
  const [confirmed, setConfirmed] = useState(false);

  const start = useMutation({
    mutationFn: ({ file, memo }: { file: File; memo: string }) => requestImageDescribe(file, memo),
    onSuccess: (res) => setJobId(res.jobId),
  });

  const job = useJob(jobId, 3000);
  const resultUrl = job.data?.status === "DONE" ? job.data.resultUrl : null;

  const result = useQuery({
    queryKey: ["image-description", resultUrl],
    queryFn: () => getImageDescription(resultUrl as string),
    enabled: Boolean(resultUrl),
    staleTime: Infinity,
  });

  // 결과가 도착하면 확인 화면을 연다 (민감 주제는 자동으로 켬)
  useEffect(() => {
    if (!result.data) return;
    onDescribed(result.data);
    setDraft(result.data.description);
    setNames({});
    setApplied({});
    setConfirmed(false);
    onPendingChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.data]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file);
    setFileError(problem);
    if (problem) return;
    setPreview(URL.createObjectURL(file));
    setJobId(null);
    setConfirmed(false);
    onPendingChange(false);
    onConfirm(null, null);
    start.mutate({ file, memo: hint });
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  /** 이름 없는 부호를 입력한 이름으로 설명 안에서 바꾼다 */
  const applyName = (code: string) => {
    const name = (names[code] ?? "").trim();
    if (!name) return;
    const from = applied[code] ?? code;
    setDraft((d) => d.split(from).join(name));
    setApplied((a) => ({ ...a, [code]: name }));
  };

  const confirm = () => {
    if (!result.data) return;
    onConfirm(draft.trim(), result.data.descriptionId);
    setConfirmed(true);
    onPendingChange(false);
  };

  const working = start.isPending || (Boolean(jobId) && !resultUrl && job.data?.status !== "FAILED") || result.isLoading;
  const error =
    fileError ??
    (start.error instanceof ApiError ? start.error.message : start.error ? "도면을 올리지 못했습니다." : null) ??
    (job.data?.status === "FAILED" ? (job.data.error ?? "도면 설명을 만들지 못했습니다.") : null) ??
    (result.error instanceof ApiError ? result.error.message : null);

  const data = result.data;
  const unnamed = data?.parts.filter((p) => isUnnamed(p.name)) ?? [];
  const named = data?.parts.filter((p) => !isUnnamed(p.name)) ?? [];
  const pendingCodes = unnamed.filter((p) => !applied[p.name]).length;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">
        도면 이미지 <span className="font-normal text-[#6B7280]">(선택 · 올리면 AI가 설명 초안을 써 줘요)</span>
      </span>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-24 cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-3 text-sm ${
          dragging ? "border-[#1E3A5F] bg-[#E8EEF6]" : "border-[#9CA3AF] bg-[#F7F8FA] hover:bg-[#F1F3F6]"
        }`}
      >
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="올린 도면" className="h-20 w-28 shrink-0 rounded border bg-white object-contain" />
        )}
        <span className="flex items-center gap-2 text-[#4B5563]">
          {working && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9DB3CF] border-t-[#1E3A5F]" aria-hidden />
          )}
          {working
            ? "도면을 분석하는 중… (1분 정도 걸려요)"
            : preview
              ? "다른 도면으로 바꾸려면 클릭하거나 끌어다 놓으세요"
              : "도면 이미지를 끌어다 놓거나 클릭해서 업로드 (PNG·JPG, 최대 10MB)"}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          disabled={working}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      <input
        value={hint}
        maxLength={2000}
        onChange={(e) => setHint(e.target.value)}
        disabled={working}
        placeholder="도면 메모 (선택) · 예) 차량 터치 패널 입력 장치 단면도"
        className="rounded-lg border border-[#C9CDD3] px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-[#8F2D1F]">{error}</p>}

      {data && confirmed && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#9DB3CF] bg-[#F2F6FB] px-4 py-3 text-sm">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-semibold text-[#1E3A5F]">✓ 확인한 도면 설명 · 검색과 비교에 함께 쓰여요</span>
            <span className="line-clamp-2 text-xs text-[#374151]">{draft}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmed(false);
              onPendingChange(true);
              onConfirm(null, null);
            }}
            className="text-xs font-semibold text-[#1E3A5F] underline"
          >
            다시 고치기
          </button>
        </div>
      )}

      {data && !confirmed && (
        <div className="flex flex-col gap-4 rounded-lg border-2 border-[#1E3A5F] bg-white p-4 text-sm">
          <div>
            <p className="font-bold text-[#1E3A5F]">도면 설명 확인</p>
            <p className="mt-1 text-xs text-[#4B5563]">
              AI 초안이에요. 그림에 이름이 없는 부호는 AI가 이름을 지어낼 수 있으니, 고친 뒤 <b>확인</b>을 눌러야 검색에 쓰여요.
            </p>
          </div>

          {unnamed.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-[#E7C38A] bg-[#FDF6EA] p-3">
              <p className="font-semibold text-[#9A5F0C]">이름이 없는 부호 {unnamed.length}개 · 부품 이름을 입력해 주세요</p>
              {unnamed.map((p) => (
                <div key={p.name} className="flex flex-wrap items-center gap-2">
                  <span className="w-24 shrink-0 font-mono font-bold text-[#9A5F0C]">{p.name}</span>
                  <span className="min-w-0 flex-1 text-xs text-[#4B5563]">{p.role}</span>
                  <input
                    value={names[p.name] ?? ""}
                    onChange={(e) => setNames((n) => ({ ...n, [p.name]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyName(p.name);
                      }
                    }}
                    placeholder="부품 이름"
                    className="w-40 rounded border border-[#E7C38A] bg-white px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => applyName(p.name)}
                    disabled={!(names[p.name] ?? "").trim()}
                    className="rounded bg-[#9A5F0C] px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
                  >
                    {applied[p.name] ? "다시 바꾸기" : "설명에 반영"}
                  </button>
                  {applied[p.name] && <span className="text-xs text-[#1E3A5F]">✓ {applied[p.name]}</span>}
                </div>
              ))}
            </div>
          )}

          {named.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#374151]">AI가 찾은 부품</span>
              <div className="flex flex-wrap gap-1.5">
                {named.map((p) => (
                  <span key={p.name} title={p.role} className="rounded bg-[#F1F3F6] px-2 py-0.5 text-xs">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#374151]">설명 (직접 고칠 수 있어요)</span>
            <textarea
              value={draft}
              maxLength={2000}
              rows={6}
              onChange={(e) => setDraft(e.target.value)}
              className="resize-y rounded-md border border-[#C9CDD3] p-3 leading-relaxed outline-none focus:border-[#1E3A5F]"
            />
            <span className="self-end text-xs text-[#6B7280]">{draft.length} / 2,000자</span>
          </label>

          {data.uncertain.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#9A5F0C]">그림만으로 알 수 없는 점 · 알고 있다면 설명에 보완해 주세요 (선택)</span>
              <ul className="list-disc pl-5 text-[#374151]">
                {data.uncertain.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {pendingCodes > 0 && <span className="text-xs text-[#9A5F0C]">이름을 넣지 않은 부호 {pendingCodes}개가 남아 있어요</span>}
            <button
              type="button"
              onClick={confirm}
              disabled={!draft.trim()}
              className="rounded-md bg-[#1E3A5F] px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
