import SearchResultView from "@/components/search/SearchResultView";

/** SCR-02 검색 결과: 주소의 searchId로 저장된 결과를 불러온다. */
export default async function SearchResultPage({ params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params;
  return <SearchResultView searchId={searchId} />;
}
