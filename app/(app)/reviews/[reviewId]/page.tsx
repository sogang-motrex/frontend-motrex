import ComparisonView from "@/components/compare/ComparisonView";

/** SCR-04 비교 검토 */
export default async function ReviewPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  return <ComparisonView reviewId={reviewId} />;
}
