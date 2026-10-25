import { redirect } from "next/navigation";

/** 첫 화면은 검색 입력(SCR-01)으로 보낸다. */
export default function Home() {
  redirect("/search");
}
