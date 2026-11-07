import ComparisonView from "@/components/compare/ComparisonView";

/** SCR-04 비교 검토. ?jobId= 가 있으면 비교표 생성 진행을 바로 보여 준다. */
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ reviewId: string }>;
  searchParams: Promise<{ jobId?: string | string[] }>;
}) {
  const { reviewId } = await params;
  const { jobId } = await searchParams;
  return <ComparisonView reviewId={reviewId} initialJobId={typeof jobId === "string" ? jobId : null} />;
}
