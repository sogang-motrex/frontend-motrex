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

export type ApplyMode = "replace" | "append";

/**
 * SCR-01 도면 업로드: 이미지를 올리면 AI가 기술 설명 초안을 써서 입력칸에 채운다 (약 47초, 같은 그림은 캐시로 바로).
 * 입력칸이 비어 있으면 바로 채우고, 이미 글이 있으면 바꿀지 덧붙일지 고르게 한다.
 * 도면은 서버에 저장되지 않고, 미리보기는 브라우저에서만 보여 준다.
 */
export default function ImageDescribe({
  currentText,
  onApply,
  onDescribed,
}: {
  currentText: string;
  onApply: (text: string, mode: ApplyMode) => void;
  onDescribed: (result: ImageDescribeResult) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

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

  // 결과가 처음 도착했을 때: 민감 주제 체크를 켜고, 입력칸이 비어 있으면 바로 채운다
  useEffect(() => {
    if (!result.data) return;
    onDescribed(result.data);
    if (!currentText.trim()) {
      onApply(result.data.description, "replace");
      setApplied(true);
    }
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
    setApplied(false);
    setJobId(null);
    start.mutate({ file, memo: hint });
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const working = start.isPending || (Boolean(jobId) && !resultUrl && job.data?.status !== "FAILED") || result.isLoading;
  const error =
    fileError ??
    (start.error instanceof ApiError ? start.error.message : start.error ? "도면을 올리지 못했습니다." : null) ??
    (job.data?.status === "FAILED" ? (job.data.error ?? "도면 설명을 만들지 못했습니다.") : null) ??
    (result.error instanceof ApiError ? result.error.message : null);

  const data = result.data;

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
        placeholder="도면 메모 (선택) · 예) 차량 대시보드 디스플레이 인출 구조 단면도"
        className="rounded-lg border border-[#C9CDD3] px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-[#8F2D1F]">{error}</p>}

      {data && (
        <div className="flex flex-col gap-3 rounded-lg border border-[#9DB3CF] bg-[#F2F6FB] p-3 text-sm">
          {applied ? (
            <p className="font-semibold text-[#1E3A5F]">AI 설명 초안을 위 입력칸에 넣었어요. 필요하면 고쳐서 검색하세요.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-[#1E3A5F]">AI 설명 초안이 준비됐어요. 이미 입력한 설명이 있어요.</p>
              <p className="rounded-md bg-white p-2 leading-relaxed">{data.description}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApply(data.description, "replace");
                    setApplied(true);
                  }}
                  className="rounded-md bg-[#1E3A5F] px-3 py-1.5 text-xs font-bold text-white"
                >
                  초안으로 바꾸기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApply(data.description, "append");
                    setApplied(true);
                  }}
                  className="rounded-md border border-[#9DB3CF] bg-white px-3 py-1.5 text-xs font-semibold"
                >
                  뒤에 덧붙이기
                </button>
              </div>
            </div>
          )}

          {data.parts.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#374151]">AI가 찾은 부품</span>
              <div className="flex flex-wrap gap-1.5">
                {data.parts.map((p) => (
                  <span key={p.name} title={p.role} className="rounded bg-white px-2 py-0.5 text-xs">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.uncertain.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#9A3412]">그림만으로 알 수 없는 점 · 설명에 보완해 주세요</span>
              <ul className="list-disc pl-5 text-[#374151]">
                {data.uncertain.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
