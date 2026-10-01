"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive, isPublicPath } from "./nav";

export default function Sidebar() {
  const pathname = usePathname();
  if (isPublicPath(pathname)) return null;

  return (
    <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="px-5 py-5 text-lg font-bold text-indigo-600">플래너</div>
      <nav aria-label="주 메뉴" className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              isActive(pathname, item.href)
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
