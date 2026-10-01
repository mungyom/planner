"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive, isPublicPath } from "./nav";
import UserMenu from "./UserMenu";

export default function Header() {
  const pathname = usePathname();
  if (isPublicPath(pathname)) return null;
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <span className="font-bold text-indigo-600 md:hidden">플래너</span>
        <h1 className="text-base font-semibold md:text-lg">
          {current?.label ?? "플래너"}
        </h1>
        <UserMenu />
      </div>
      {/* 사이드바가 숨겨지는 모바일 폭에서의 메뉴 */}
      <nav
        aria-label="모바일 메뉴"
        className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
              isActive(pathname, item.href)
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
