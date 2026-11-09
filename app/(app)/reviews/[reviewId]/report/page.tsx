import ExportView from "@/components/report/ExportView";

/** SCR-05 비교 자료 내보내기 (보고서 문장 초안은 다음 단계) */
export default async function ReportPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  return <ExportView reviewId={reviewId} />;
}
