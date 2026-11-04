"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { ApiError } from "@/lib/api";
import { describeImage, validateImage } from "@/lib/api/imageDescribe";

/**
 * SCR-01 도면 업로드: 이미지를 올리면 AI가 기술 설명 초안을 써서 입력칸에 채운다.
 * 입력칸이 비어 있으면 바로 채우고, 이미 글이 있으면 덮어쓸지 덧붙일지 고르게 한다.
 */
export default function ImageDescribe({
  currentText,
  onApply,
}: {
  currentText: string;
  onApply: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [applied, setApplied] = useState(false);

  const describe = useMutation({
    mutationFn: describeImage,
    onSuccess: (result) => {
      if (!currentText.trim()) {
        onApply(result.description);
        setApplied(true);
      }
    },
  });

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateImage(file);
    setFileError(problem);
    if (problem) return;
    setPreview(URL.createObjectURL(file));
    setApplied(false);
    describe.mutate(file);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const result = describe.data;
  const error =
    fileError ??
    (describe.error instanceof ApiError ? describe.error.message : describe.error ? "도면을 분석하지 못했습니다." : null);

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
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="올린 도면" className="h-20 w-28 shrink-0 rounded border bg-white object-contain" />
        ) : null}
        <span className="text-[#4B5563]">
          {describe.isPending
            ? "도면을 분석하는 중… (실제 AI는 1분 가까이 걸릴 수 있어요)"
            : preview
              ? "다른 도면으로 바꾸려면 클릭하거나 끌어다 놓으세요"
              : "도면 이미지를 끌어다 놓거나 클릭해서 업로드 (PNG·JPG, 최대 10MB)"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      {error && <p className="text-sm text-[#8F2D1F]">{error}</p>}

      {result && (
        <div className="flex flex-col gap-3 rounded-lg border border-[#9DB3CF] bg-[#F2F6FB] p-3 text-sm">
          {applied ? (
            <p className="font-semibold text-[#1E3A5F]">AI 설명 초안을 위 입력칸에 채웠어요. 필요하면 고쳐서 검색하세요.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-[#1E3A5F]">AI 설명 초안이 준비됐어요. 이미 입력한 설명이 있어요.</p>
              <p className="rounded-md bg-white p-2 leading-relaxed">{result.description}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onApply(result.description);
                    setApplied(true);
                  }}
                  className="rounded-md bg-[#1E3A5F] px-3 py-1.5 text-xs font-bold text-white"
                >
                  초안으로 바꾸기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApply(`${currentText.trim()}\n${result.description}`);
                    setApplied(true);
                  }}
                  className="rounded-md border border-[#9DB3CF] bg-white px-3 py-1.5 text-xs font-semibold"
                >
                  뒤에 덧붙이기
                </button>
              </div>
            </div>
          )}

          {result.parts.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#374151]">AI가 찾은 부품</span>
              <div className="flex flex-wrap gap-1.5">
                {result.parts.map((p) => (
                  <span key={p.name} title={p.role} className="rounded bg-white px-2 py-0.5 text-xs">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.uncertain.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#9A3412]">그림만으로 알 수 없는 점 · 설명에 보완해 주세요</span>
              <ul className="list-disc pl-5 text-[#374151]">
                {result.uncertain.map((u) => (
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
