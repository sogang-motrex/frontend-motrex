import type { ReactNode } from "react";
import AppHeader from "@/components/layout/AppHeader";

/**
 * 서비스 화면 공통 레이아웃: 상단 메뉴 + 본문 영역.
 * (app) 괄호 폴더는 주소에 나타나지 않고 레이아웃만 묶는다. /health 같은 개발용 페이지에는 적용되지 않는다.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#1F2630]">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
