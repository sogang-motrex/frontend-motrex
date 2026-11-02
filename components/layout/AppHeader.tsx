"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/search", label: "새 검토", match: ["/search", "/patents", "/reviews"] },
  { href: "/history", label: "검토 이력", match: ["/history"] },
];

/** 화면설계서 공통 상단 메뉴: [서비스명] · 새 검토 · 검토 이력 · 사용자 */
export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-[#E6E9ED] bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex h-full items-center gap-8">
          <Link href="/search" className="text-lg font-bold">
            [서비스명]
          </Link>
          <nav className="flex h-full items-center gap-6">
            {NAV.map((item) => {
              const active = item.match.some((p) => pathname.startsWith(p));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-full items-center border-b-2 text-sm ${
                    active
                      ? "border-[#1E3A5F] font-bold text-[#1E3A5F]"
                      : "border-transparent text-[#4B5563] hover:text-[#1F2630]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-[#D1D5DB]" />
          <span className="text-sm text-[#4B5563]">[사용자]</span>
        </div>
      </div>
    </header>
  );
}
